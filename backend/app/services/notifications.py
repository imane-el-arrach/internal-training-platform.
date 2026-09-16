import uuid

from sqlmodel import Session

from app.models.notification import Notification, TypeNotification


def creer_notification(
    session: Session,
    utilisateur_id: uuid.UUID,
    type_: TypeNotification,
    titre: str,
    message: str | None = None,
    lien: str | None = None,
) -> Notification:
   
    notification = Notification(
        utilisateur_id=utilisateur_id,
        type=type_,
        titre=titre,
        message=message,
        lien=lien,
    )
    session.add(notification)
    return notification
