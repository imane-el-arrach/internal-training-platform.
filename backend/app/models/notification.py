import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


class TypeNotification(str, Enum):
    formation = "formation"
    quiz = "quiz"
    certificat = "certificat"
    rappel = "rappel"
    systeme = "systeme"


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    utilisateur_id: uuid.UUID = Field(
        sa_column=Column(
            PGUUID(as_uuid=True), ForeignKey("utilisateurs.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    type: TypeNotification = Field(
        sa_column=Column(SAEnum(TypeNotification, name="type_notification"), nullable=False)
    )
    titre: str = Field(max_length=255, nullable=False)
    message: str | None = None
    lien: str | None = Field(default=None, max_length=500)
    lu: bool = Field(default=False, nullable=False)
    date_creation: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )
