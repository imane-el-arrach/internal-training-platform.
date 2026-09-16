from sqlmodel import SQLModel

from app.schemas.question import QuestionCreate


class QuestionsLotCreate(SQLModel):
    """
    Enveloppe simple autour de QuestionCreate — aucune duplication, on
    réutilise le même schéma que la création unitaire et que quiz_propose.
    """
    questions: list[QuestionCreate]