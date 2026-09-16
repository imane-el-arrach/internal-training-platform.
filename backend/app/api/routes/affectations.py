import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.dialects.postgresql import insert as pg_insert

from sqlmodel import Session, select
from app.api.deps import exiger_administrateur
from app.db.session import get_session
from app.models.affectation import Affectation
from app.models.departement import Departement
from app.models.formation import Formation
from app.models.notification import TypeNotification
from app.models.progression import Progression
from app.models.utilisateur import Utilisateur
from app.schemas.affectation import AffectationCreate, AffectationRead
from app.services.notifications import creer_notification

router = APIRouter(prefix="/api/affectations", tags=["Affectations"])


def _generer_progressions(
    session: Session,
    formation_id: uuid.UUID,
    affectation_id: uuid.UUID,
    utilisateurs_cibles: list[uuid.UUID],
) -> int:
    """
    Fan-out performant : une seule requête SQL groupée, quelle que soit la
    taille de la cible (un individu ou un département entier).

    - ON CONFLICT DO NOTHING : si une progression existe déjà pour un couple
      (utilisateur, formation) — par ex. affectation individuelle antérieure
      sur cette même formation —, cette ligne précise est ignorée sans faire
      échouer le reste du lot.
    """
    if not utilisateurs_cibles:
        return 0

    lignes = [
        {
            "id": uuid.uuid4(),
            "utilisateur_id": uid,
            "formation_id": formation_id,
            "affectation_id": affectation_id,
            "statut": "non_commence",
            "pourcentage": 0,
        }
        for uid in utilisateurs_cibles
    ]

    stmt = pg_insert(Progression.__table__).values(lignes)
    stmt = stmt.on_conflict_do_nothing(
        index_elements=["utilisateur_id", "formation_id"]
    )
    # `rowcount` peut valoir -1 avec PostgreSQL pour un INSERT ... ON CONFLICT.
    # On compte donc les identifiants réellement retournés : le message affiché
    # à l'administrateur reflète exactement le nombre de progressions créées.
    resultat = session.execute(stmt.returning(Progression.id))
    return len(resultat.scalars().all())


@router.post(
    "",
    response_model=AffectationRead,
    status_code=status.HTTP_201_CREATED,
)
def creer_affectation(
    donnees: AffectationCreate,
    admin: Utilisateur = Depends(exiger_administrateur),
    session: Session = Depends(get_session),
) -> AffectationRead:
    formation = session.get(Formation, donnees.formation_id)
    if formation is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La formation indiquée n'existe pas",
        )

    if donnees.utilisateur_id is not None:
        cible_existe = session.get(Utilisateur, donnees.utilisateur_id) is not None
        entite = "utilisateur"
    else:
        cible_existe = session.get(Departement, donnees.departement_id) is not None
        entite = "département"

    if not cible_existe:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Le {entite} indiqué n'existe pas",
        )

    affectation = Affectation(
        formation_id=donnees.formation_id,
        utilisateur_id=donnees.utilisateur_id,
        departement_id=donnees.departement_id,
        affecte_par=admin.id,
        date_limite=donnees.date_limite,
    )
    session.add(affectation)
    session.flush()  # obtient affectation.id sans committer, transaction toujours ouverte

    # Détermine la liste des utilisateurs concernés en une requête légère
    # (id uniquement, pas les objets complets).
    if donnees.utilisateur_id is not None:
        cibles = [donnees.utilisateur_id]
    else:
        cibles = list(
            session.exec(
                select(Utilisateur.id).where(
                    Utilisateur.departement_id == donnees.departement_id,
                    Utilisateur.actif == True,  # noqa: E712
                )
            ).all()
        )

    nb_generees = _generer_progressions(session, formation.id, affectation.id, cibles)

    for uid in cibles:
        creer_notification(
            session,
            utilisateur_id=uid,
            type_=TypeNotification.formation,
            titre="Nouvelle formation affectée",
            message=f"La formation « {formation.titre} » vous a été affectée.",
        )

    # Un seul commit : affectation + toutes les progressions + notifications, tout ou rien.
    session.commit()
    session.refresh(affectation)

    return AffectationRead(
        **affectation.model_dump(),
        nombre_progressions_generees=nb_generees,
    )


@router.get("", response_model=list[AffectationRead])
def lister_affectations(
    formation_id: uuid.UUID | None = Query(default=None),
    departement_id: uuid.UUID | None = Query(default=None),
    utilisateur_id: uuid.UUID | None = Query(default=None),
    admin: Utilisateur = Depends(exiger_administrateur),
    session: Session = Depends(get_session),
) -> list[AffectationRead]:
    requete = select(Affectation)
    if formation_id is not None:
        requete = requete.where(Affectation.formation_id == formation_id)
    if departement_id is not None:
        requete = requete.where(Affectation.departement_id == departement_id)
    if utilisateur_id is not None:
        requete = requete.where(Affectation.utilisateur_id == utilisateur_id)

    affectations = session.exec(requete).all()

    resultats = []
    for aff in affectations:
        nb = session.exec(
            select(Progression).where(Progression.affectation_id == aff.id)
        ).all()
        resultats.append(
            AffectationRead(**aff.model_dump(), nombre_progressions_generees=len(nb))
        )
    return resultats


@router.delete(
    "/{affectation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_affectation(
    affectation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    """
    Suppression physique : entraîne, via ON DELETE CASCADE, la suppression
    des progressions qui en découlaient. Choix assumé — une affectation
    retirée par erreur ne doit pas laisser de progression "fantôme" sans
    justification. À ne pas confondre avec la désactivation logique des
    formations/utilisateurs, qui elle préserve l'historique.
    """
    affectation = session.get(Affectation, affectation_id)
    if affectation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Affectation introuvable")

    session.delete(affectation)
    session.commit()
