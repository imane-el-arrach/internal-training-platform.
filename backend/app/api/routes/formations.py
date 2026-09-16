import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.core.stockage import supprimer_fichier
from app.db.session import get_session
from app.models.categorie import Categorie
from app.models.contenu import Contenu, TypeContenu
from app.models.formation import Formation
from app.models.utilisateur import Utilisateur
from app.schemas.formation import FormationCreate, FormationRead, FormationUpdate

router = APIRouter(prefix="/api/formations", tags=["Formations"])


@router.post(
    "",
    response_model=FormationRead,
    status_code=status.HTTP_201_CREATED,
)
def creer_formation(
    donnees: FormationCreate,
    admin: Utilisateur = Depends(exiger_administrateur),
    session: Session = Depends(get_session),
) -> Formation:
    categorie = session.get(Categorie, donnees.categorie_id)
    if categorie is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La catégorie indiquée n'existe pas",
        )

    formation = Formation(
        titre=donnees.titre,
        description=donnees.description,
        categorie_id=donnees.categorie_id,
        obligatoire=donnees.obligatoire,
        duree_estimee_minutes=donnees.duree_estimee_minutes,
        cree_par=admin.id,
    )
    session.add(formation)
    session.commit()
    session.refresh(formation)
    return formation


@router.get(
    "",
    response_model=list[FormationRead],
    dependencies=[Depends(get_utilisateur_courant)],
)
def lister_formations(
    actif: bool | None = Query(default=None),
    categorie_id: uuid.UUID | None = Query(default=None),
    obligatoire: bool | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[Formation]:
    requete = select(Formation)
    if actif is not None:
        requete = requete.where(Formation.actif == actif)
    if categorie_id is not None:
        requete = requete.where(Formation.categorie_id == categorie_id)
    if obligatoire is not None:
        requete = requete.where(Formation.obligatoire == obligatoire)
    return list(session.exec(requete).all())


@router.get(
    "/{formation_id}",
    response_model=FormationRead,
    dependencies=[Depends(get_utilisateur_courant)],
)
def lire_formation(
    formation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> Formation:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")
    return formation


@router.patch(
    "/{formation_id}",
    response_model=FormationRead,
    dependencies=[Depends(exiger_administrateur)],
)
def modifier_formation(
    formation_id: uuid.UUID,
    donnees: FormationUpdate,
    session: Session = Depends(get_session),
) -> Formation:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    changements = donnees.model_dump(exclude_unset=True)

    nouvelle_categorie_id = changements.get("categorie_id")
    if nouvelle_categorie_id is not None:
        if session.get(Categorie, nouvelle_categorie_id) is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="La catégorie indiquée n'existe pas",
            )

    for champ, valeur in changements.items():
        setattr(formation, champ, valeur)

    session.add(formation)
    session.commit()
    session.refresh(formation)
    return formation


@router.delete(
    "/{formation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def desactiver_formation(
    formation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    """
    Désactivation logique, jamais de suppression physique : une formation
    désactivée doit rester visible dans l'historique/les certificats déjà
    obtenus par les collaborateurs qui l'ont suivie.
    """
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    formation.actif = False
    session.add(formation)
    session.commit()


@router.delete(
    "/{formation_id}/supprimer-definitivement",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_formation_definitivement(
    formation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    """Supprime une formation de test, ses données associées et ses fichiers."""
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    contenus = list(session.exec(select(Contenu).where(Contenu.formation_id == formation_id)).all())
    for contenu in contenus:
        if contenu.type != TypeContenu.lien:
            supprimer_fichier(contenu.chemin_fichier)

    session.delete(formation)
    session.commit()


@router.post(
    "/{formation_id}/reactiver",
    response_model=FormationRead,
    dependencies=[Depends(exiger_administrateur)],
)
def reactiver_formation(
    formation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> Formation:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    if formation.actif:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette formation est déjà active",
        )

    formation.actif = True
    session.add(formation)
    session.commit()
    session.refresh(formation)
    return formation
