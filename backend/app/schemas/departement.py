import uuid
from datetime import datetime

from sqlmodel import SQLModel


class DepartementCreate(SQLModel):
    nom: str
    description: str | None = None


class DepartementRead(SQLModel):
    id: uuid.UUID
    nom: str
    description: str | None
    date_creation: datetime
