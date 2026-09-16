import uuid
from datetime import datetime
from pydantic import Field
from sqlmodel import SQLModel


class QuestionnaireCreate(SQLModel):
    titre: str
    score_minimum_reussite: int = 70
    nombre_tentatives_max: int | None = None
    temps_limite_secondes: int | None = Field(default=None, gt=0)


class QuestionnaireUpdate(SQLModel):
    titre: str | None = None
    score_minimum_reussite: int | None = None
    nombre_tentatives_max: int | None = None
    temps_limite_secondes: int | None = Field(default=None, gt=0)


class QuestionnaireRead(SQLModel):
    id: uuid.UUID
    formation_id: uuid.UUID
    titre: str
    score_minimum_reussite: int
    nombre_tentatives_max: int | None
    temps_limite_secondes: int | None
    date_creation: datetime

