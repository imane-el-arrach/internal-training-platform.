import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import engine, get_session
from app.models.contenu import Contenu
from app.models.contenu_chunk import ContenuChunk
from app.models.formation import Formation
from app.schemas.ingestion import IngestionLancee, IngestionStatut, ResultatRecherche
from app.services.recherche import rechercher_chunks_formation
from app.services.ingestion import lancer_ingestion_en_arriere_plan

router = APIRouter(tags=["Assistant IA"])


def _tache_ingestion_arriere_plan(contenu_id: uuid.UUID) -> None:
    with Session(engine) as session:
        contenu = session.get(Contenu, contenu_id)
        if contenu is None:
            return
        try:
            ingerer_contenu(session, contenu)
        except Exception as e:
            # Pas de colonne de statut en base pour l'instant (choix
            # volontaire, cf. discussion) : on journalise au moins l'échec
            # pour pouvoir le diagnostiquer via les logs du serveur.
            print(f"[ingestion] Échec pour le contenu {contenu_id} : {e}")


@router.post(
    "/api/contenus/{contenu_id}/ingerer",
    response_model=IngestionLancee,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(exiger_administrateur)],
)
def declencher_ingestion(
    contenu_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> IngestionLancee:
    contenu = session.get(Contenu, contenu_id)
    if contenu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenu introuvable")

    background_tasks.add_task(lancer_ingestion_en_arriere_plan, contenu_id)

    return IngestionLancee(
        contenu_id=contenu.id,
        message="Réindexation lancée. Le contenu sera disponible dans l’assistant dès que le traitement sera terminé.",
    )


@router.get(
    "/api/contenus/{contenu_id}/chunks/statut",
    response_model=IngestionStatut,
    dependencies=[Depends(get_utilisateur_courant)],
)
def statut_ingestion(
    contenu_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> IngestionStatut:
    contenu = session.get(Contenu, contenu_id)
    if contenu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contenu introuvable")

    nb = session.exec(
        select(func.count()).select_from(ContenuChunk).where(ContenuChunk.contenu_id == contenu_id)
    ).one()

    return IngestionStatut(contenu_id=contenu_id, nombre_fragments=nb)


@router.get(
    "/api/formations/{formation_id}/recherche",
    response_model=list[ResultatRecherche],
    dependencies=[Depends(get_utilisateur_courant)],
)
def rechercher(
    formation_id: uuid.UUID,
    q: str = Query(..., min_length=3, description="Question ou terme de recherche"),
    top_k: int = Query(default=5, ge=1, le=20),
    session: Session = Depends(get_session),
) -> list[ResultatRecherche]:
    formation = session.get(Formation, formation_id)
    if formation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation introuvable")

    resultats = rechercher_chunks_formation(session, formation_id, q, top_k)

    return [
        ResultatRecherche(
            contenu_id=chunk.contenu_id,
            fragment_id=chunk.id,
            texte=chunk.texte,
            score_similarite=round(score, 4),
        )
        for chunk, score in resultats
    ]
