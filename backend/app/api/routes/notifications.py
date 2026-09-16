import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_utilisateur_courant
from app.db.session import get_session
from app.models.notification import Notification
from app.models.utilisateur import Utilisateur
from app.schemas.notification import NotificationRead

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NombreNonLues(BaseModel):
    nombre: int


@router.get("", response_model=list[NotificationRead])
def lister_mes_notifications(
    lu: bool | None = Query(default=None, description="Filtrer par statut lu/non lu"),
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> list[Notification]:
    requete = select(Notification).where(Notification.utilisateur_id == utilisateur.id)
    if lu is not None:
        requete = requete.where(Notification.lu == lu)
    requete = requete.order_by(Notification.date_creation.desc())
    return list(session.exec(requete).all())


@router.patch("/{notification_id}/lire", response_model=NotificationRead)
def marquer_comme_lue(
    notification_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> Notification:
    notification = session.get(Notification, notification_id)
    if notification is None or notification.utilisateur_id != utilisateur.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification introuvable")

    notification.lu = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


@router.get("/non-lues/nombre", response_model=NombreNonLues)
def compter_notifications_non_lues(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> NombreNonLues:
    requete = select(Notification).where(
        Notification.utilisateur_id == utilisateur.id,
        Notification.lu == False,  # noqa: E712
    )
    nombre = len(list(session.exec(requete).all()))
    return NombreNonLues(nombre=nombre)


@router.patch("/lire-tout", response_model=NombreNonLues)
def marquer_toutes_comme_lues(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> NombreNonLues:
    requete = select(Notification).where(
        Notification.utilisateur_id == utilisateur.id,
        Notification.lu == False,  # noqa: E712
    )
    non_lues = list(session.exec(requete).all())
    for notification in non_lues:
        notification.lu = True
        session.add(notification)

    session.commit()
    return NombreNonLues(nombre=len(non_lues))
