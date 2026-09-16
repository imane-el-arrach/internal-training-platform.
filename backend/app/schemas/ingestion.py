import uuid

from sqlmodel import SQLModel


class ResultatRecherche(SQLModel):
    contenu_id: uuid.UUID
    fragment_id: uuid.UUID
    texte: str
    score_similarite: float


class IngestionLancee(SQLModel):
    """Réponse immédiate — l'ingestion tourne en arrière-plan, pas encore terminée."""
    contenu_id: uuid.UUID
    message: str


class IngestionStatut(SQLModel):
    contenu_id: uuid.UUID
    nombre_fragments: int
