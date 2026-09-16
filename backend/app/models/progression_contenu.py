import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class ProgressionContenu(SQLModel, table=True):
    __tablename__ = "progressions_contenus"
    __table_args__ = (
        UniqueConstraint(
            "utilisateur_id",
            "contenu_id",
            name="uq_progression_contenu_utilisateur",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("utilisateurs.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    contenu_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("contenus.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date_completion: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )