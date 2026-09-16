import uuid

from sqlmodel import SQLModel


class ReponsePossibleCreate(SQLModel):
    texte: str
    est_correcte: bool = False


class ReponsePossibleRead(SQLModel):
    """Vue administrateur : révèle la bonne réponse."""
    id: uuid.UUID
    texte: str
    est_correcte: bool
    ordre: int


class ReponsePossiblePublic(SQLModel):
    """
    Vue collaborateur pendant le passage du quiz : ne révèle JAMAIS
    est_correcte avant la soumission de la tentative.
    """
    id: uuid.UUID
    texte: str
    ordre: int
