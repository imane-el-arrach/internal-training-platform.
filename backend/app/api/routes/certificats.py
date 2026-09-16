import io
import uuid
from datetime import date, timezone, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select


from app.api.deps import exiger_administrateur, get_utilisateur_courant
from app.db.session import get_session
from app.models.certificat import Certificat
from app.models.formation import Formation
from app.models.tentative import Tentative
from app.models.utilisateur import Utilisateur
from app.schemas.certificat import CertificatPublic
from app.services.certificat_pdf import generer_pdf_certificat

router = APIRouter(prefix="/api/certificats", tags=["Certificats"])


def _obtenir_certificat_et_donnees_publiques(
    certificat_id: uuid.UUID, session: Session
) -> tuple[Certificat, CertificatPublic]:
    certificat = session.get(Certificat, certificat_id)
    if certificat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificat introuvable")

    utilisateur = session.get(Utilisateur, certificat.utilisateur_id)
    formation = session.get(Formation, certificat.formation_id)

    # Le score vit sur Tentative, pas sur Certificat — tentative_id est
    # nullable (ON DELETE SET NULL), le certificat reste valide, juste sans score affiché.
    score = None
    if certificat.tentative_id is not None:
        tentative = session.get(Tentative, certificat.tentative_id)
        if tentative is not None:
            score = tentative.score

    aujourd_hui = date.today()
    valide = certificat.date_expiration is None or certificat.date_expiration >= aujourd_hui

    donnees = CertificatPublic(
        nom_complet=f"{utilisateur.prenom} {utilisateur.nom}" if utilisateur else "Utilisateur inconnu",
        formation_titre=formation.titre if formation else "Formation inconnue",
        score=score,
        date_obtention=certificat.date_obtention,
        numero_certificat=certificat.numero_certificat,
        valide=valide,
    )
    return certificat, donnees


@router.get("/{certificat_id}/public", response_model=CertificatPublic)
def consulter_certificat_public(
    certificat_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> CertificatPublic:
    _, donnees = _obtenir_certificat_et_donnees_publiques(certificat_id, session)
    return donnees

@router.get("/{certificat_id}/public/pdf")
def telecharger_certificat_pdf(
    certificat_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    certificat, donnees = _obtenir_certificat_et_donnees_publiques(certificat_id, session)
    pdf_bytes = generer_pdf_certificat(certificat_id=certificat.id, donnees=donnees)

    nom_fichier = f"certificat_{donnees.numero_certificat}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nom_fichier}"'},
    )


@router.get("/{certificat_id}/public/pdf/apercu")
def consulter_certificat_pdf(
    certificat_id: uuid.UUID,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    """Expose le même fichier PDF, mais pour lecture intégrée au navigateur."""
    certificat, donnees = _obtenir_certificat_et_donnees_publiques(certificat_id, session)
    pdf_bytes = generer_pdf_certificat(certificat_id=certificat.id, donnees=donnees)

    nom_fichier = f"certificat_{donnees.numero_certificat}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{nom_fichier}"'},
    )


@router.get("/mes-certificats", response_model=list[Certificat])
def lister_mes_certificats(
    utilisateur: Utilisateur = Depends(get_utilisateur_courant),
    session: Session = Depends(get_session),
) -> list[Certificat]:
    return list(
        session.exec(select(Certificat).where(Certificat.utilisateur_id == utilisateur.id)).all()
    )


@router.get("", response_model=list[Certificat], dependencies=[Depends(exiger_administrateur)])
def lister_certificats(
    utilisateur_id: uuid.UUID | None = Query(default=None),
    formation_id: uuid.UUID | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[Certificat]:
    requete = select(Certificat)
    if utilisateur_id is not None:
        requete = requete.where(Certificat.utilisateur_id == utilisateur_id)
    if formation_id is not None:
        requete = requete.where(Certificat.formation_id == formation_id)
    return list(session.exec(requete).all())
