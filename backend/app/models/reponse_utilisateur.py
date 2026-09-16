import uuid
from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class ReponseUtilisateur(SQLModel, table=True):
    __tablename__ = "reponses_utilisateur"
    __table_args__ = (UniqueConstraint("tentative_id", "question_id", name="uq_reponse_question"),)
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tentative_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("tentatives.id", ondelete="CASCADE"), nullable=False)
    )
    question_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    )
    reponse_possible_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("reponses_possibles.id", ondelete="CASCADE"), nullable=False)
    )
    est_correcte: bool = Field(nullable=False)
