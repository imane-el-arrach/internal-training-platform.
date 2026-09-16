import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.question import Question


class ReponsePossible(SQLModel, table=True):
    __tablename__ = "reponses_possibles"

    __table_args__ = (
        UniqueConstraint("question_id", "ordre", name="uq_reponse_ordre"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    question_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    texte: str = Field(max_length=500, nullable=False)

    est_correcte: bool = Field(default=False, nullable=False)

    ordre: int = Field(default=1, nullable=False)

    # Relation vers la question
    question: "Question" = Relationship(back_populates="reponses")