import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.models.contenu import TypeContenu

# Extensions autorisées par type de contenu — première ligne de défense contre
# l'upload de fichiers exécutables déguisés (ex: .exe renommé en .mp4).
EXTENSIONS_AUTORISEES: dict[TypeContenu, set[str]] = {
    TypeContenu.video: {".mp4", ".webm", ".mov"},
    TypeContenu.pdf: {".pdf"},
    TypeContenu.presentation: {".pptx", ".ppt", ".key"},
    TypeContenu.document: {".pdf", ".docx", ".doc"},
}

UPLOAD_ROOT = Path(settings.UPLOAD_DIR)


def _nom_fichier_sur(nom_original: str) -> str:
    """Retire tout ce qui n'est pas alphanumérique/point/tiret pour éviter
    la traversée de répertoire (../../) ou les caractères piégeux."""
    nom = Path(nom_original).name  # supprime tout chemin, garde le nom seul
    nom = re.sub(r"[^A-Za-z0-9._-]", "_", nom)
    return nom or "fichier"


def valider_extension(type_contenu: TypeContenu, nom_fichier: str) -> None:
    extension = Path(nom_fichier).suffix.lower()
    autorisees = EXTENSIONS_AUTORISEES.get(type_contenu, set())
    if extension not in autorisees:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Extension '{extension}' non autorisée pour le type '{type_contenu.value}'. "
                   f"Attendu : {', '.join(sorted(autorisees))}",
        )


def sauvegarder_fichier(formation_id: uuid.UUID, fichier: UploadFile) -> str:
    """Écrit le fichier sur disque et retourne le chemin relatif à stocker en BDD."""
    dossier = UPLOAD_ROOT / "formations" / str(formation_id)
    dossier.mkdir(parents=True, exist_ok=True)

    nom_unique = f"{uuid.uuid4().hex}_{_nom_fichier_sur(fichier.filename or 'fichier')}"
    chemin_absolu = dossier / nom_unique

    taille_max = settings.TAILLE_MAX_FICHIER_MO * 1024 * 1024
    taille = 0
    with open(chemin_absolu, "wb") as f:
        while chunk := fichier.file.read(1024 * 1024):
            taille += len(chunk)
            if taille > taille_max:
                f.close()
                chemin_absolu.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Fichier trop volumineux (max {settings.TAILLE_MAX_FICHIER_MO} Mo)",
                )
            f.write(chunk)

    return f"formations/{formation_id}/{nom_unique}"


def supprimer_fichier(chemin_relatif: str) -> None:
    chemin_absolu = UPLOAD_ROOT / chemin_relatif
    chemin_absolu.unlink(missing_ok=True)
