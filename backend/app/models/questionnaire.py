import uuid
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class Questionnaire(SQLModel, table=True):
    __tablename__ = "questionnaires"
    __table_args__ = (
        CheckConstraint(
            "temps_limite_secondes IS NULL OR temps_limite_secondes > 0",
            name="chk_temps_limite",
        ),
    )
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    formation_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("formations.id", ondelete="CASCADE"), nullable=False)
    )
    titre: str = Field(max_length=255, nullable=False)
    score_minimum_reussite: int = Field(default=70, nullable=False)
    nombre_tentatives_max: int | None = None
    temps_limite_secondes: int | None = None  # NULL = pas de limite de temps
    date_creation: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
