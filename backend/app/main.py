import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    affectations,
    auth,
    categories,
    certificats,
    contenus,
    departements,
    formations,
    notifications,
    progressions,
    rapports,
    questionnaires,
    questions,
    tentatives,
    utilisateurs,
    ingestion,
    assistant,
    banque_questions,
    commentaires
)
from app.core.config import settings

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Plateforme de formation — EXIA Technologies",
    version="0.1.0",
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Permet au frontend de lire Content-Disposition (sinon axios voit undefined
    # et le nom de fichier tombe en fallback). Également utile si on lit
    # d'autres headers personnalisés plus tard.
    expose_headers=["Content-Disposition"],
)

app.include_router(auth.router)
app.include_router(utilisateurs.router)
app.include_router(departements.router)
app.include_router(categories.router)
app.include_router(formations.router)
app.include_router(contenus.router)
app.include_router(affectations.router)
app.include_router(progressions.router)
app.include_router(rapports.router)
app.include_router(questionnaires.router)
app.include_router(questions.router)
app.include_router(tentatives.router)
app.include_router(certificats.router)
app.include_router(notifications.router)
app.include_router(ingestion.router)

app.include_router(assistant.router)
app.include_router(commentaires.router)
app.include_router(banque_questions.router)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health", tags=["Santé"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
