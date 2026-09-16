import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.core.security import hash_mot_de_passe
from app.db.session import get_session
from app.models.utilisateur import RoleUtilisateur, Utilisateur
from app.schemas.utilisateur import UtilisateurCreate, UtilisateurRead, UtilisateurUpdate

router = APIRouter(prefix="/api/utilisateurs", tags=["Utilisateurs"])


def _compter_administrateurs_actifs(session: Session, exclure_id: uuid.UUID | None = None) -> int:
    requete = select(Utilisateur).where(
        Utilisateur.role == RoleUtilisateur.administrateur,
        Utilisateur.actif == True,  # noqa: E712
    )
    admins = session.exec(requete).all()
    if exclure_id is not None:
        admins = [a for a in admins if a.id != exclure_id]
    return len(admins)


@router.get("/me", response_model=UtilisateurRead)
def lire_mon_profil(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
) -> Utilisateur:
    return utilisateur


@router.post(
    "",
    response_model=UtilisateurRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def creer_utilisateur(
    donnees: UtilisateurCreate,
    session: Session = Depends(get_session),
) -> Utilisateur:
    email_existe = session.exec(
        select(Utilisateur).where(Utilisateur.email == donnees.email)
    ).first()
    if email_existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un utilisateur avec cet email existe déjà",
        )

    utilisateur = Utilisateur(
        nom=donnees.nom,
        prenom=donnees.prenom,
        email=donnees.email,
        mot_de_passe_hash=hash_mot_de_passe(donnees.mot_de_passe),
        role=donnees.role,
        poste=donnees.poste,
        departement_id=donnees.departement_id,
    )
    session.add(utilisateur)
    session.commit()
    session.refresh(utilisateur)
    return utilisateur


@router.get(
    "",
    response_model=list[UtilisateurRead],
    dependencies=[Depends(exiger_administrateur)],
)
def lister_utilisateurs(
    actif: bool | None = Query(
        default=None,
        description="true = actifs uniquement, false = désactivés uniquement, "
                    "omis = tous les utilisateurs",
    ),
    session: Session = Depends(get_session),
) -> list[Utilisateur]:
    requete = select(Utilisateur)
    if actif is not None:
        requete = requete.where(Utilisateur.actif == actif)
    return list(session.exec(requete).all())


@router.get(
    "/{utilisateur_id}",
    response_model=UtilisateurRead,
    dependencies=[Depends(exiger_administrateur)],
)
def lire_utilisateur(
    utilisateur_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> Utilisateur:
    utilisateur = session.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    return utilisateur


@router.patch(
    "/{utilisateur_id}",
    response_model=UtilisateurRead,
    dependencies=[Depends(exiger_administrateur)],
)
def modifier_utilisateur(
    utilisateur_id: uuid.UUID,
    donnees: UtilisateurUpdate,
    session: Session = Depends(get_session),
) -> Utilisateur:
    utilisateur = session.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    changements = donnees.model_dump(exclude_unset=True)

    # Le dernier administrateur actif ne peut être ni désactivé ni rétrogradé.
    desactive_ici = changements.get("actif") is False
    retrograde_ici = (
        utilisateur.role == RoleUtilisateur.administrateur
        and changements.get("role") not in (None, RoleUtilisateur.administrateur)
    )
    if (
        (desactive_ici or retrograde_ici)
        and utilisateur.actif
        and _compter_administrateurs_actifs(session, exclure_id=utilisateur.id) == 0
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de modifier le dernier administrateur actif",
        )

    nouvel_email = changements.get("email")
    if nouvel_email is not None and nouvel_email != utilisateur.email:
        email_existe = session.exec(
            select(Utilisateur).where(Utilisateur.email == nouvel_email)
        ).first()
        if email_existe is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un utilisateur avec cet email existe déjà",
            )

    mot_de_passe = changements.pop("mot_de_passe", None)
    if mot_de_passe:
        utilisateur.mot_de_passe_hash = hash_mot_de_passe(mot_de_passe)

    for champ, valeur in changements.items():
        setattr(utilisateur, champ, valeur)

    session.add(utilisateur)
    session.commit()
    session.refresh(utilisateur)
    return utilisateur


@router.delete(
    "/{utilisateur_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def desactiver_utilisateur(
    utilisateur_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    """
    Désactivation logique (actif = False), jamais de suppression physique :
    on préserve l'historique de formation même si un compte est désactivé.
    """
    utilisateur = session.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    if (
        utilisateur.role == RoleUtilisateur.administrateur
        and _compter_administrateurs_actifs(session, exclure_id=utilisateur.id) == 0
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de désactiver le dernier administrateur actif",
        )

    utilisateur.actif = False
    session.add(utilisateur)
    session.commit()


@router.delete(
    "/{utilisateur_id}/supprimer-definitivement",
    status_code=status.HTTP_204_NO_CONTENT,
)
def supprimer_utilisateur_definitivement(
    utilisateur_id: uuid.UUID,
    admin: Utilisateur = Depends(exiger_administrateur),
    session: Session = Depends(get_session),
) -> None:
    """Supprime définitivement un compte et ses données dépendantes en cascade."""
    if admin.id == utilisateur_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vous ne pouvez pas supprimer le compte avec lequel vous êtes connecté.",
        )

    utilisateur = session.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    try:
        session.delete(utilisateur)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce compte est référencé comme auteur d’affectations. Désactivez-le ou réattribuez ces affectations avant de le supprimer.",
        )


@router.post(
    "/{utilisateur_id}/reactiver",
    response_model=UtilisateurRead,
    dependencies=[Depends(exiger_administrateur)],
)
def reactiver_utilisateur(
    utilisateur_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> Utilisateur:
    utilisateur = session.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    if utilisateur.actif:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet utilisateur est déjà actif",
        )

    utilisateur.actif = True
    session.add(utilisateur)
    session.commit()
    session.refresh(utilisateur)
    return utilisateur
