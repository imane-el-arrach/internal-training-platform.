import uuid

from sqlalchemy import CheckConstraint, Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel, Relationship

from app.models.reponse_possible import ReponsePossible


class Question(SQLModel, table=True):
    __tablename__ = "questions"
    __table_args__ = (
        UniqueConstraint("questionnaire_id", "ordre", name="uq_question_ordre"),
        CheckConstraint("points > 0", name="chk_points"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    questionnaire_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True),
            ForeignKey("questionnaires.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    enonce: str = Field(nullable=False)
    ordre: int = Field(default=1, nullable=False)
    points: int = Field(default=1, nullable=False)

    reponses: list["ReponsePossible"] = Relationship(
        back_populates="question",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True},
    )