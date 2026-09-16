import uuid
from datetime import date, datetime, timezone

from sqlalchemy import CheckConstraint, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class Certificat(SQLModel, table=True):
    __tablename__ = "certificats"
    __table_args__ = (
        CheckConstraint(
            "date_expiration IS NULL OR date_expiration >= date_obtention::DATE",
            name="chk_date_expiration",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    formation_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("formations.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

   
    tentative_id: uuid.UUID | None = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("tentatives.id", ondelete="SET NULL"),
            nullable=True,
        )
    )
    numero_certificat: str = Field(max_length=50, unique=True, nullable=False)
    fichier_pdf: str | None = Field(default=None, max_length=500)
    date_obtention: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
    date_expiration: date | None = None

