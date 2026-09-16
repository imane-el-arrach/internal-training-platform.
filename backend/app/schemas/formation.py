import uuid
from datetime import datetime

from sqlmodel import SQLModel


class FormationCreate(SQLModel):
    titre: str
    description: str | None = None
    categorie_id: uuid.UUID
    obligatoire: bool = False
    duree_estimee_minutes: int | None = None
    # cree_par n'est jamais fourni par le client : déduit de l'admin authentifié


class FormationUpdate(SQLModel):
    titre: str | None = None
    description: str | None = None
    categorie_id: uuid.UUID | None = None
    obligatoire: bool | None = None
    duree_estimee_minutes: int | None = None


class FormationRead(SQLModel):
    id: uuid.UUID
    titre: str
    description: str | None
    categorie_id: uuid.UUID
    obligatoire: bool
    actif: bool
    duree_estimee_minutes: int | None
    cree_par: uuid.UUID | None
    date_creation: datetime
    date_modification: datetime