import uuid
from datetime import datetime

from sqlmodel import SQLModel

from app.models.notification import TypeNotification


class NotificationRead(SQLModel):
    id: uuid.UUID
    type: TypeNotification
    titre: str
    message: str | None
    lien: str | None
    lu: bool
    date_creation: datetime
