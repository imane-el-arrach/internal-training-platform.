import re
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from app.services.ingestion import lancer_ingestion_en_arriere_plan
from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.core.stockage import UPLOAD_ROOT, sauvegarder_fichier, supprimer_fichier, valider_extension
from app.db.session import get_session
from app.models.contenu import Contenu, TypeContenu
from app.models.formation import Formation
from app.schemas.contenu import ContenuRead

router = APIRouter(prefix="/api/formations/{formation_id}/contenus", tags=["Contenus"])


def _get_formation_ou_404(formation_id: uuid.UUID, session: Session) -> Formation:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")
    return formation


def _prochain_ordre(formation_id: uuid.UUID, session: Session) -> int:
    contenus = session.exec(
        select(Contenu).where(Contenu.formation_id == formation_id)
    ).all()
    return (max((c.ordre for c in contenus), default=0)) + 1


@router.post(
    "",
    response_model=ContenuRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_administrateur)],
)
def ajouter_contenu(
    formation_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    type: TypeContenu = Form(...),
    titre: str = Form(...),
    ordre: int | None = Form(default=None),
    duree_secondes: int | None = Form(default=None),
    url: str | None = Form(default=None, description="Requis si type = lien"),
    fichier: UploadFile | None = None,
    session: Session = Depends(get_session),
) -> Contenu:
    _get_formation_ou_404(formation_id, session)

    if type in {TypeContenu.video, TypeContenu.pdf, TypeContenu.presentation} and (
        duree_secondes is None or duree_secondes <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Une durée estimée supérieure à zéro est requise pour suivre ce contenu.",
        )

    if type == TypeContenu.lien:
        if not url:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Le champ 'url' est requis pour un contenu de type 'lien'",
            )
        chemin_fichier = url
    else:
        if fichier is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Un fichier est requis pour un contenu de type '{type.value}'",
            )
        valider_extension(type, fichier.filename or "")
        chemin_fichier = sauvegarder_fichier(formation_id, fichier)

    ordre_final = ordre if ordre is not None else _prochain_ordre(formation_id, session)

    contenu = Contenu(
        formation_id=formation_id,
        type=type,
        titre=titre,
        chemin_fichier=chemin_fichier,
        ordre=ordre_final,
        duree_secondes=duree_secondes,
    )
    session.add(contenu)
    try:
        session.commit()
    except Exception:
        session.rollback()
        if type != TypeContenu.lien:
            supprimer_fichier(chemin_fichier)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un contenu occupe déjà la position {ordre_final} dans cette formation",
        )
    session.refresh(contenu)
    background_tasks.add_task(lancer_ingestion_en_arriere_plan, contenu.id)
    return contenu


@router.get(
    "",
    response_model=list[ContenuRead],
    dependencies=[Depends(get_utilisateur_courant)],
)
def lister_contenus(
    formation_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> list[Contenu]:
    _get_formation_ou_404(formation_id, session)
    return list(
        session.exec(
            select(Contenu).where(Contenu.formation_id == formation_id).order_by(Contenu.ordre)
        ).all()
    )


@router.patch(
    "/{contenu_id}",
    response_model=ContenuRead,
    dependencies=[Depends(exiger_administrateur)],
)
def modifier_contenu(
    formation_id: uuid.UUID,
    contenu_id: uuid.UUID,
    titre: str | None = Form(default=None),
    ordre: int | None = Form(default=None),
    duree_secondes: int | None = Form(default=None),
    session: Session = Depends(get_session),
) -> Contenu:
    """
    Modification des métadonnées uniquement (titre, ordre, durée). Remplacer
    le fichier lui-même se fait en supprimant puis recréant le contenu, pour
    ne jamais avoir un chemin_fichier orphelin ou incohérent.
    """
    contenu = session.get(Contenu, contenu_id)
    if contenu is None or contenu.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenu introuvable")

    if titre is not None:
        contenu.titre = titre
    if ordre is not None:
        contenu.ordre = ordre
    if duree_secondes is not None:
        contenu.duree_secondes = duree_secondes

    session.add(contenu)
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Un contenu occupe déjà la position {ordre} dans cette formation",
        )
    session.refresh(contenu)
    return contenu


@router.delete(
    "/{contenu_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_administrateur)],
)
def supprimer_contenu(
    formation_id: uuid.UUID,
    contenu_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> None:
    """
    Suppression physique, fichier compris. À la différence des formations,
    un contenu isolé n'a pas de valeur d'historique propre — mais attention :
    ceci modifie le nombre total de contenus d'une formation, donc le calcul
    de progression des collaborateurs déjà en cours devra en tenir compte
    (recalcul géré dans le module progressions, pas ici).
    """
    contenu = session.get(Contenu, contenu_id)
    if contenu is None or contenu.formation_id != formation_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenu introuvable")

    if contenu.type != TypeContenu.lien:
        supprimer_fichier(contenu.chemin_fichier)

    session.delete(contenu)
    session.commit()


def _nom_fichier_propre(titre: str, extension: str) -> str:
    """Génère un nom de fichier sûr à partir du titre du contenu.
    Évite les caractères piégeux et conserve l'extension d'origine.
    """
    titre_propre = re.sub(r"[^A-Za-z0-9._-]", "_", titre).strip("_")
    if not titre_propre:
        titre_propre = "contenu"
    return f"{titre_propre}{extension}"


@router.get(
    "/{contenu_id}/telecharger",
    dependencies=[Depends(get_utilisateur_courant)],
)
def telecharger_contenu(
    formation_id: uuid.UUID,
    contenu_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> FileResponse:
    """
    Téléchargement forcé d'un contenu (PDF, vidéo, présentation, document).

    Nécessaire car les fichiers sont servis via /uploads/ sans header
    Content-Disposition: attachment, et l'attribut `download` de <a> est
    ignoré en cross-origin (front :5173, back :8000). Cette route pose le
    bon header + un nom de fichier propre dérivé du titre du contenu.
    """
    contenu = session.get(Contenu, contenu_id)
    if contenu is None or contenu.formation_id != formation_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contenu introuvable"
        )

    if contenu.type == TypeContenu.lien:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Les liens externes ne peuvent pas être téléchargés via l'API.",
        )

    chemin_absolu = UPLOAD_ROOT / contenu.chemin_fichier
    if not chemin_absolu.exists() or not chemin_absolu.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier physique introuvable sur le serveur.",
        )

    nom_fichier = _nom_fichier_propre(contenu.titre, chemin_absolu.suffix)

    return FileResponse(
        path=str(chemin_absolu),
        filename=nom_fichier,
        media_type="application/octet-stream",
    )
