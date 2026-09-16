import uuid
from datetime import datetime

from sqlmodel import SQLModel


class CategorieCreate(SQLModel):
    nom: str
    description: str | None = None
    couleur: str | None = None  # format hex, ex: #127A5B


class CategorieUpdate(SQLModel):
    nom: str | None = None
    description: str | None = None
    couleur: str | None = None


class CategorieRead(SQLModel):
    id: uuid.UUID
    nom: str
    description: str | None
    couleur: str | None
    date_creation: datetime