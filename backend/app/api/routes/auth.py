from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.core.security import creer_access_token, verifier_mot_de_passe
from app.db.session import get_session
from app.models.utilisateur import Utilisateur
from app.schemas.auth import Token

router = APIRouter(prefix="/api/auth", tags=["Authentification"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
) -> Token:
    """
    form_data.username porte l'email (convention OAuth2PasswordRequestForm).
    Le message d'erreur reste volontairement générique pour ne pas révéler
    si c'est l'email ou le mot de passe qui est incorrect.
    """
    utilisateur = session.exec(
        select(Utilisateur).where(Utilisateur.email == form_data.username)
    ).first()

    if (
        utilisateur is None
        or not utilisateur.actif
        or not verifier_mot_de_passe(form_data.password, utilisateur.mot_de_passe_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    token = creer_access_token(subject=str(utilisateur.id), role=utilisateur.role.value)
    return Token(access_token=token)
