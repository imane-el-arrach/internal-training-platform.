import uuid
from datetime import datetime

from app.schemas.reponse_possible import ReponsePossibleCreate
from pydantic import model_validator
from sqlmodel import SQLModel


class QuestionBanqueCreate(SQLModel):
    enonce: str
    points: int = 1
    reponses: list[ReponsePossibleCreate]

    @model_validator(mode="after")
    def verifier_reponses(self) -> "QuestionBanqueCreate":
        if len(self.reponses) < 2 or not any(reponse.est_correcte for reponse in self.reponses):
            raise ValueError("Une question doit comporter au moins deux réponses dont une correcte")
        return self


class ReponseBanqueRead(SQLModel):
    id: uuid.UUID
    texte: str
    est_correcte: bool
    ordre: int


class QuestionBanqueRead(SQLModel):
    id: uuid.UUID
    enonce: str
    points: int
    date_creation: datetime
    reponses: list[ReponseBanqueRead]
