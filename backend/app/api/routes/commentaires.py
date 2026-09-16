import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_utilisateur_courant
from app.db.session import get_session
from app.models.commentaire import Commentaire, CommentaireLike
from app.models.formation import Formation
from app.models.progression import Progression
from app.models.utilisateur import RoleUtilisateur, Utilisateur
from app.schemas.commentaire import CommentaireCreate, CommentaireRead, CommentaireUpdate

router = APIRouter(prefix="/api/formations/{formation_id}/commentaires", tags=["Commentaires"])


def _peut_commenter(utilisateur: Utilisateur, formation_id: uuid.UUID, session: Session) -> bool:
    """
    Un admin peut toujours commenter (répondre aux collaborateurs).
    Un collaborateur doit être affecté à la formation
    """
    if utilisateur.role == RoleUtilisateur.administrateur:
        return True
    progression = session.exec(
        select(Progression).where(
            Progression.utilisateur_id == utilisateur.id,
            Progression.formation_id == formation_id,
        )
    ).first()
    return progression is not None


def _vers_read(session: Session, c: Commentaire, utilisateur_courant: Utilisateur) -> CommentaireRead:
    auteur = session.get(Utilisateur, c.utilisateur_id)
    nb_likes = len(
        session.exec(select(CommentaireLike).where(CommentaireLike.commentaire_id == c.id)).all()
    )
    aime_par_moi = (
        session.get(CommentaireLike, (c.id, utilisateur_courant.id)) is not None
    )
    return CommentaireRead(
        id=c.id,
        formation_id=c.formation_id,
        utilisateur_id=c.utilisateur_id,
        parent_id=c.parent_id,
        auteur_nom=auteur.nom if auteur else "Utilisateur supprimé",
        auteur_prenom=auteur.prenom if auteur else "",
        contenu=c.contenu,
        date_creation=c.date_creation,
        date_modification=c.date_modification,
        nb_likes=nb_likes,
        aime_par_moi=aime_par_moi,
    )


@router.post("", response_model=CommentaireRead, status_code=status.HTTP_201_CREATED)
def creer_commentaire(
    formation_id: uuid.UUID,
    donnees: CommentaireCreate,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> CommentaireRead:
    if session.get(Formation, formation_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    if not _peut_commenter(utilisateur, formation_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous devez être affecté à cette formation pour la commenter",
        )

    if donnees.parent_id is not None:
        parent = session.get(Commentaire, donnees.parent_id)
        if parent is None or parent.formation_id != formation_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentaire parent introuvable")
        # Réponses simples uniquement : on ne peut pas répondre à une réponse.
        if parent.parent_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de répondre à une réponse",
            )

    commentaire = Commentaire(
        formation_id=formation_id,
        utilisateur_id=utilisateur.id,
        parent_id=donnees.parent_id,
        contenu=donnees.contenu,
    )
    session.add(commentaire)
    session.commit()
    session.refresh(commentaire)
    return _vers_read(session, commentaire, utilisateur)


@router.get("", response_model=list[CommentaireRead])
def lister_commentaires(
    formation_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> list[CommentaireRead]:
    if session.get(Formation, formation_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    commentaires = session.exec(
        select(Commentaire)
        .where(Commentaire.formation_id == formation_id)
        .order_by(Commentaire.date_creation)
    ).all()
    return [_vers_read(session, c, utilisateur) for c in commentaires]


@router.patch("/{commentaire_id}", response_model=CommentaireRead)
def modifier_commentaire(
    formation_id: uuid.UUID,
    commentaire_id: uuid.UUID,
    donnees: CommentaireUpdate,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> CommentaireRead:
    commentaire = session.get(Commentaire, commentaire_id)
    if commentaire is None or commentaire.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentaire introuvable")

    # Seul l'auteur peut modifier — même l'admin ne modifie pas le
    # commentaire de quelqu'un d'autre, il peut seulement le supprimer
    # (modération), jamais le réécrire à sa place.
    if commentaire.utilisateur_id != utilisateur.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez modifier que vos propres commentaires",
        )

    commentaire.contenu = donnees.contenu
    commentaire.date_modification = datetime.now(timezone.utc)
    session.add(commentaire)
    session.commit()
    session.refresh(commentaire)
    return _vers_read(session, commentaire, utilisateur)


@router.delete("/{commentaire_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_commentaire(
    formation_id: uuid.UUID,
    commentaire_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> None:
    commentaire = session.get(Commentaire, commentaire_id)
    if commentaire is None or commentaire.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentaire introuvable")

    # Modération : l'auteur OU un admin peut supprimer.
    est_auteur = commentaire.utilisateur_id == utilisateur.id
    est_admin = utilisateur.role == RoleUtilisateur.administrateur
    if not (est_auteur or est_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez supprimer que vos propres commentaires",
        )

    session.delete(commentaire)
    session.commit()


@router.post("/{commentaire_id}/likes", response_model=CommentaireRead, status_code=status.HTTP_201_CREATED)
def aimer_commentaire(
    formation_id: uuid.UUID,
    commentaire_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> CommentaireRead:
    commentaire = session.get(Commentaire, commentaire_id)
    if commentaire is None or commentaire.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentaire introuvable")

    if not _peut_commenter(utilisateur, formation_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous devez être affecté à cette formation pour aimer un commentaire",
        )

    if session.get(CommentaireLike, (commentaire_id, utilisateur.id)) is None:
        session.add(CommentaireLike(commentaire_id=commentaire_id, utilisateur_id=utilisateur.id))
        session.commit()

    return _vers_read(session, commentaire, utilisateur)


@router.delete("/{commentaire_id}/likes", response_model=CommentaireRead)
def retirer_like_commentaire(
    formation_id: uuid.UUID,
    commentaire_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> CommentaireRead:
    commentaire = session.get(Commentaire, commentaire_id)
    if commentaire is None or commentaire.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commentaire introuvable")

    like = session.get(CommentaireLike, (commentaire_id, utilisateur.id))
    if like is not None:
        session.delete(like)
        session.commit()

    return _vers_read(session, commentaire, utilisateur)
