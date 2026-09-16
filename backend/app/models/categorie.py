import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class Categorie(SQLModel, table=True):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint(
            "couleur IS NULL OR couleur ~ '^#[0-9A-Fa-f]{6}$'",
            name="chk_couleur_hex",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    nom: str = Field(max_length=100, unique=True, nullable=False)
    description: str | None = None
    couleur: str | None = Field(default=None, max_length=7)
    date_creation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    date_modification: datetime | None = None