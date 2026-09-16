import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class Commentaire(SQLModel, table=True):
    __tablename__ = "commentaires"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    formation_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("formations.id", ondelete="CASCADE"), nullable=False)
    )
    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), nullable=False)
    )
    parent_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column(PGUUID(as_uuid=True), ForeignKey("commentaires.id", ondelete="CASCADE"), nullable=True),
    )
    contenu: str = Field(nullable=False, max_length=2000)
    date_creation: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    date_modification: datetime | None = None


class CommentaireLike(SQLModel, table=True):
    """Un like d'un utilisateur sur un commentaire (unicité : un seul like par utilisateur/commentaire)."""

    __tablename__ = "commentaire_likes"

    commentaire_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("commentaires.id", ondelete="CASCADE"), primary_key=True
        )
    )
    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"), primary_key=True
        )
    )
    date_creation: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
