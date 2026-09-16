import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.departement import Departement
from app.models.affectation import Affectation
from app.models.utilisateur import Utilisateur
from app.schemas.departement import DepartementCreate, DepartementRead

router = APIRouter(prefix="/api/departements", tags=["Départements"])


@router.post(
    "",
    response_model=DepartementRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def creer_departement(
    donnees: DepartementCreate,
    session: Session = Depends(get_session),
) -> Departement:
    existe = session.exec(select(Departement).where(Departement.nom == donnees.nom)).first()
    if existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un département avec ce nom existe déjà",
        )

    departement = Departement(nom=donnees.nom, description=donnees.description)
    session.add(departement)
    session.commit()
    session.refresh(departement)
    return departement


@router.get(
    "",
    response_model=list[DepartementRead],
    dependencies=[Depends(get_utilisateur_courant)],  # accessible à tout utilisateur connecté
)
def lister_departements(session: Session = Depends(get_session)) -> list[Departement]:
    return list(session.exec(select(Departement)).all())


@router.delete(
    "/{departement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_departement(
    departement_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    departement = session.get(Departement, departement_id)
    if departement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")

    contient_utilisateurs = session.exec(
        select(Utilisateur.id).where(Utilisateur.departement_id == departement_id)
    ).first()
    contient_affectations = session.exec(
        select(Affectation.id).where(Affectation.departement_id == departement_id)
    ).first()
    if contient_utilisateurs or contient_affectations:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce service est encore utilisé. Réaffectez ses collaborateurs et retirez ses affectations avant de le supprimer.",
        )

    session.delete(departement)
    session.commit()
