import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.categorie import Categorie
from app.schemas.categorie import CategorieCreate, CategorieRead, CategorieUpdate

router = APIRouter(prefix="/api/categories", tags=["Catégories"])


@router.post(
    "",
    response_model=CategorieRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def creer_categorie(
    donnees: CategorieCreate,
    session: Session = Depends(get_session),
) -> Categorie:
    existe = session.exec(select(Categorie).where(Categorie.nom == donnees.nom)).first()
    if existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une catégorie avec ce nom existe déjà",
        )

    categorie = Categorie(
        nom=donnees.nom, description=donnees.description, couleur=donnees.couleur
    )
    session.add(categorie)
    session.commit()
    session.refresh(categorie)
    return categorie


@router.get(
    "",
    response_model=list[CategorieRead],
    dependencies=[Depends(get_utilisateur_courant)],
)
def lister_categories(session: Session = Depends(get_session)) -> list[Categorie]:
    return list(session.exec(select(Categorie)).all())


@router.patch(
    "/{categorie_id}",
    response_model=CategorieRead,
    dependencies=[Depends(exiger_administrateur)],
)
def modifier_categorie(
    categorie_id: uuid.UUID,
    donnees: CategorieUpdate,
    session: Session = Depends(get_session),
) -> Categorie:
    categorie = session.get(Categorie, categorie_id)
    if categorie is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")

    changements = donnees.model_dump(exclude_unset=True)
    for champ, valeur in changements.items():
        setattr(categorie, champ, valeur)

    session.add(categorie)
    session.commit()
    session.refresh(categorie)
    return categorie


@router.delete(
    "/{categorie_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_categorie(
    categorie_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    """
    Suppression physique ici (contrairement aux utilisateurs/formations) : une
    catégorie sans formation associée n'a pas de valeur historique à préserver.
    Bloquée par la BDD (ON DELETE RESTRICT sur formations.categorie_id) si des
    formations l'utilisent encore — l'admin doit d'abord les recatégoriser.
    """
    categorie = session.get(Categorie, categorie_id)
    if categorie is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catégorie introuvable")

    session.delete(categorie)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de supprimer : des formations sont encore rattachées à cette catégorie",
        )
