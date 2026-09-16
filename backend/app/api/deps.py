import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app.core.security import decoder_access_token
from app.db.session import get_session
from app.models.utilisateur import RoleUtilisateur, Utilisateur

# tokenUrl pointe vers la route de login définie dans routes/auth.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def get_utilisateur_courant(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> Utilisateur:
    identifiants_invalides = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides ou session expirée",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decoder_access_token(token)
    if payload is None or "sub" not in payload:
        raise identifiants_invalides

    utilisateur = session.get(Utilisateur, uuid.UUID(payload["sub"]))
    if utilisateur is None or not utilisateur.actif:
        raise identifiants_invalides

    return utilisateur


def exiger_administrateur(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
) -> Utilisateur:
    """
    À utiliser comme dépendance sur toute route réservée aux administrateurs.
    La vérification du rôle se fait ici, côté serveur — jamais uniquement
    côté interface.
    """
    if utilisateur.role != RoleUtilisateur.administrateur:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Action réservée aux administrateurs",
        )
    return utilisateur
