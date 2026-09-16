import uuid
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.question import QuestionCreate  
from app.services.prompts import ModeAssistant


class AssistantQuestionRequest(BaseModel):
    question: str = Field(..., min_length=2)


class AssistantGenerationRequest(BaseModel):
    nombre_points: int = Field(default=10, ge=1, le=20)
    nombre_questions: int = Field(default=5, ge=1, le=20)


class FragmentUtilise(BaseModel):
    fragment_id: uuid.UUID
    contenu_id: uuid.UUID
    texte: str
    score_similarite: Optional[float] = None


class AssistantReponse(BaseModel):
    mode: ModeAssistant
    reponse: str
    fragments_utilises: list[FragmentUtilise] = []
    quiz_propose: Optional[list[QuestionCreate]] = None