import uuid
from datetime import datetime

from pydantic import Field as PydanticField
from sqlmodel import SQLModel


class CommentaireCreate(SQLModel):
    contenu: str = PydanticField(..., min_length=1, max_length=2000)
    parent_id: uuid.UUID | None = None


class CommentaireUpdate(SQLModel):
    contenu: str = PydanticField(..., min_length=1, max_length=2000)


class CommentaireRead(SQLModel):
    id: uuid.UUID
    formation_id: uuid.UUID
    utilisateur_id: uuid.UUID
    parent_id: uuid.UUID | None
    auteur_nom: str
    auteur_prenom: str
    contenu: str
    date_creation: datetime
    date_modification: datetime | None
    nb_likes: int
    aime_par_moi: bool
