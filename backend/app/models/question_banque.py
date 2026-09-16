import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class QuestionBanque(SQLModel, table=True):
    __tablename__ = "questions_banque"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    enonce: str = Field(nullable=False)
    points: int = Field(default=1, nullable=False)
    cree_par: uuid.UUID | None = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True)
    )
    date_creation: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)


class ReponseBanque(SQLModel, table=True):
    __tablename__ = "reponses_banque"
    __table_args__ = (UniqueConstraint("question_banque_id", "ordre", name="uq_reponse_banque_ordre"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    question_banque_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("questions_banque.id", ondelete="CASCADE"), nullable=False)
    )
    texte: str = Field(max_length=500, nullable=False)
    est_correcte: bool = Field(default=False, nullable=False)
    ordre: int = Field(default=1, nullable=False)
