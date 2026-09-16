import io
import os
import uuid

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.schemas.certificat import CertificatPublic

from app.core.config import settings



_COULEUR_PRIMAIRE = HexColor("#1E3A5F")
_COULEUR_ACCENT = HexColor("#C9A227")
_COULEUR_TEXTE = HexColor("#2B2B2B")
_COULEUR_GRISE = HexColor("#6B6B6B")
_COULEUR_VALIDE = HexColor("#1E7A34")
_COULEUR_EXPIRE = HexColor("#B3261E")


def _url_verification(certificat_id: uuid.UUID) -> str:
    return f"{settings.PUBLIC_CERTIFICATE_URL}/{certificat_id}"


def _generer_image_qr(url: str) -> ImageReader:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    tampon = io.BytesIO()
    image.save(tampon, format="PNG")
    tampon.seek(0)
    return ImageReader(tampon)


def generer_pdf_certificat(certificat_id: uuid.UUID, donnees: CertificatPublic) -> bytes:
    tampon = io.BytesIO()
    largeur, hauteur = landscape(A4)
    pdf = canvas.Canvas(tampon, pagesize=landscape(A4))

    # Cadre 
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.rect(0, 0, largeur, hauteur, fill=1, stroke=0)

    marge = 1.2 * cm
    pdf.setStrokeColor(_COULEUR_PRIMAIRE)
    pdf.setLineWidth(2)
    pdf.rect(marge, marge, largeur - 2 * marge, hauteur - 2 * marge, fill=0, stroke=1)
    pdf.setStrokeColor(_COULEUR_ACCENT)
    pdf.setLineWidth(0.7)
    pdf.rect(marge + 0.2 * cm, marge + 0.2 * cm, largeur - 2 * marge - 0.4 * cm, hauteur - 2 * marge - 0.4 * cm, fill=0, stroke=1)

    # En-tête 
    pdf.setFillColor(_COULEUR_GRISE)
    pdf.setFont("Helvetica", 11)
    pdf.drawCentredString(largeur / 2, hauteur - 3 * cm, "CERTIFICAT DE RÉUSSITE")

    pdf.setFillColor(_COULEUR_PRIMAIRE)
    pdf.setFont("Helvetica-Bold", 30)
    pdf.drawCentredString(largeur / 2, hauteur - 4.2 * cm, "Certificat de formation")

    # Nom du collaborateur 
    pdf.setFillColor(_COULEUR_GRISE)
    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(largeur / 2, hauteur - 6 * cm, "Décerné à")

    pdf.setFillColor(_COULEUR_TEXTE)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(largeur / 2, hauteur - 7.1 * cm, donnees.nom_complet)

    # Formation
    pdf.setFillColor(_COULEUR_GRISE)
    pdf.setFont("Helvetica", 12)
    pdf.drawCentredString(largeur / 2, hauteur - 8.6 * cm, "pour avoir complété avec succès la formation")

    pdf.setFillColor(_COULEUR_PRIMAIRE)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawCentredString(largeur / 2, hauteur - 9.6 * cm, donnees.formation_titre)

    # Bloc d'infos 
    y_infos = hauteur - 11.6 * cm
    x_gauche = marge + 2 * cm

    infos = [
        ("Score obtenu", f"{donnees.score} %" if donnees.score is not None else "Non disponible"),
        ("Date d'obtention", donnees.date_obtention.strftime("%d/%m/%Y")),
        ("Numéro de certificat", donnees.numero_certificat),
    ]
    for i, (libelle, valeur) in enumerate(infos):
        y = y_infos - i * 0.9 * cm
        pdf.setFillColor(_COULEUR_GRISE)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(x_gauche, y, libelle)
        pdf.setFillColor(_COULEUR_TEXTE)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(x_gauche + 5.5 * cm, y, str(valeur))

    # Statut de validité
    statut_texte = "CERTIFICAT VALIDE" if donnees.valide else "CERTIFICAT EXPIRÉ"
    statut_couleur = _COULEUR_VALIDE if donnees.valide else _COULEUR_EXPIRE
    pdf.setFillColor(statut_couleur)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(x_gauche, y_infos - 3 * 0.9 * cm - 0.4 * cm, statut_texte)

    # QR code de vérification
    url = _url_verification(certificat_id)
    taille_qr = 3.4 * cm
    x_qr = largeur - marge - 2 * cm - taille_qr
    y_qr = marge + 1.5 * cm
    pdf.drawImage(
        _generer_image_qr(url),
        x_qr,
        y_qr,
        width=taille_qr,
        height=taille_qr,
        preserveAspectRatio=True,
        mask="auto",
    )
    pdf.setFillColor(_COULEUR_GRISE)
    pdf.setFont("Helvetica", 7)
    pdf.drawCentredString(x_qr + taille_qr / 2, y_qr - 0.35 * cm, "Scanner pour vérifier")

    # Pied de page 
    pdf.setFillColor(_COULEUR_GRISE)
    pdf.setFont("Helvetica-Oblique", 8)
    pdf.drawString(marge + 0.6 * cm, marge + 0.5 * cm, f"Vérifiable sur : {url}")

    pdf.showPage()
    pdf.save()
    tampon.seek(0)
    return tampon.getvalue()
