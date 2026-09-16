from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_mot_de_passe(mot_de_passe: str) -> str:
    return pwd_context.hash(mot_de_passe)


def verifier_mot_de_passe(mot_de_passe: str, mot_de_passe_hash: str) -> bool:
    return pwd_context.verify(mot_de_passe, mot_de_passe_hash)


def creer_access_token(subject: str, role: str) -> str:
    """
    subject = id utilisateur (str), role = 'administrateur' | 'collaborateur'.
    Le rôle est embarqué dans le token pour éviter une requête BDD à chaque
    vérification de permission côté API.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decoder_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
