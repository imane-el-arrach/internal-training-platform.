import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel

# Dimension imposée par le modèle d'embeddings choisi :
# paraphrase-multilingual-MiniLM-L12-v2 -> 384 dimensions.

DIMENSION_EMBEDDING = 384


class ContenuChunk(SQLModel, table=True):
   
    __tablename__ = "contenu_chunks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    contenu_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("contenus.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    texte: str = Field(nullable=False)
    ordre: int = Field(nullable=False)

    embedding: list[float] = Field(
        sa_column=Column(Vector(DIMENSION_EMBEDDING), nullable=False)
)