import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Departement(SQLModel, table=True):
    __tablename__ = "departements"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    nom: str = Field(max_length=100, unique=True, nullable=False, index=True)
    description: str | None = None
    date_creation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    date_modification: datetime | None = None
