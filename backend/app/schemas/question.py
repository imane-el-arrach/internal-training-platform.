import uuid

from pydantic import model_validator
from sqlmodel import SQLModel

from app.schemas.reponse_possible import (
    ReponsePossibleCreate,
    ReponsePossibleRead,
    ReponsePossiblePublic,
)


class QuestionCreate(SQLModel):
    enonce: str
    points: int = 1
    reponses: list[ReponsePossibleCreate]

    @model_validator(mode="after")
    def verifier_banque_reponses(self) -> "QuestionCreate":
        if len(self.reponses) < 2:
            raise ValueError("Une question doit proposer au moins 2 réponses possibles")
        if not any(r.est_correcte for r in self.reponses):
            raise ValueError("Au moins une réponse doit être marquée comme correcte")
        return self


class QuestionUpdate(SQLModel):
    enonce: str | None = None
    points: int | None = None
    ordre: int | None = None


class QuestionRead(SQLModel):
    """Vue administrateur : inclut les réponses avec la bonne marquée."""
    id: uuid.UUID
    questionnaire_id: uuid.UUID
    enonce: str
    ordre: int
    points: int
    reponses: list[ReponsePossibleRead]


class QuestionPublic(SQLModel):
    """Vue collaborateur pendant le passage du quiz : bonne réponse cachée."""
    id: uuid.UUID
    enonce: str
    ordre: int
    points: int
    reponses: list[ReponsePossiblePublic]
