import io
from datetime import date

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

from app.schemas.rapport import RapportSuiviRead

BLEU = HexColor("#315864")
TURQUOISE = HexColor("#49BFA9")
TEXTE = HexColor("#17262A")
GRIS = HexColor("#65757A")
FOND = HexColor("#F1F6F5")
LIGNE = HexColor("#DCE7E4")


def _texte_court(texte: str, longueur: int) -> str:
    return texte if len(texte) <= longueur else f"{texte[:longueur - 1]}…"


def _pied_de_page(pdf: canvas.Canvas, largeur: float, numero: int) -> None:
    pdf.setStrokeColor(LIGNE)
    pdf.line(1.3 * cm, 1.25 * cm, largeur - 1.3 * cm, 1.25 * cm)
    pdf.setFillColor(GRIS)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(1.3 * cm, 0.8 * cm, "EXIA Academy - Rapport de suivi")
    pdf.drawRightString(largeur - 1.3 * cm, 0.8 * cm, f"Page {numero}")


def generer_pdf_rapport(rapport: RapportSuiviRead) -> bytes:
    """Rapport imprimable de synthèse et détail des progressions filtrées."""
    tampon = io.BytesIO()
    largeur, hauteur = landscape(A4)
    pdf = canvas.Canvas(tampon, pagesize=landscape(A4))
    marge = 1.3 * cm
    page = 1

    # Première page : identité et indicateurs.
    pdf.setFillColor(BLEU)
    pdf.rect(0, hauteur - 4.2 * cm, largeur, 4.2 * cm, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setFont("Helvetica-Bold", 23)
    pdf.drawString(marge, hauteur - 2.05 * cm, "Rapport de suivi")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(marge, hauteur - 2.75 * cm, "EXIA Academy - EXIA Technologies")
    pdf.setFillColor(TURQUOISE)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawRightString(largeur - marge, hauteur - 2.4 * cm, date.today().strftime("Édité le %d/%m/%Y"))

    indicateurs = [
        ("COLLABORATEURS", str(rapport.collaborateurs_concernes)),
        ("PROGRESSION", f"{rapport.taux_completion}%"),
        ("RÉUSSITE QUIZ", "-" if rapport.taux_reussite is None else f"{rapport.taux_reussite}%"),
        ("CONFORMITÉ", "-" if rapport.taux_conformite is None else f"{rapport.taux_conformite}%"),
        ("EN ATTENTE", str(rapport.formations_en_attente)),
    ]
    largeur_carte = (largeur - 2 * marge - 4 * 0.35 * cm) / 5
    y_carte = hauteur - 7.2 * cm
    for index, (libelle, valeur) in enumerate(indicateurs):
        x = marge + index * (largeur_carte + 0.35 * cm)
        pdf.setFillColor(FOND)
        pdf.roundRect(x, y_carte, largeur_carte, 1.8 * cm, 0.12 * cm, fill=1, stroke=0)
        pdf.setFillColor(BLEU)
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawString(x + 0.25 * cm, y_carte + 1.25 * cm, libelle)
        pdf.setFont("Helvetica-Bold", 19)
        pdf.drawString(x + 0.25 * cm, y_carte + 0.5 * cm, valeur)

    pdf.setFillColor(TEXTE)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(marge, y_carte - 1.15 * cm, "Vue d'ensemble")
    pdf.setFillColor(GRIS)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(marge, y_carte - 1.75 * cm, f"{rapport.progressions_total} progression(s) suivie(s), dont {rapport.progressions_terminees} terminée(s).")
    pdf.drawString(marge, y_carte - 2.35 * cm, f"{rapport.progressions_en_cours} progression(s) sont actuellement en cours.")
    _pied_de_page(pdf, largeur, page)
    pdf.showPage()
    page += 1

    # Pages suivantes : table de détail.
    colonnes = [
        (marge, "Collaborateur", 4.0 * cm),
        (marge + 4.15 * cm, "Service", 3.0 * cm),
        (marge + 7.3 * cm, "Formation", 5.0 * cm),
        (marge + 12.45 * cm, "Progression", 2.1 * cm),
        (marge + 14.7 * cm, "Statut", 2.7 * cm),
        (marge + 17.55 * cm, "Dernière activité", 3.1 * cm),
        (marge + 20.8 * cm, "Échéance", 2.5 * cm),
    ]
    y = hauteur - 1.8 * cm

    def dessiner_entete_table() -> float:
        nonlocal y
        pdf.setFillColor(BLEU)
        pdf.rect(marge, y - 0.55 * cm, largeur - 2 * marge, 0.7 * cm, fill=1, stroke=0)
        pdf.setFillColor(HexColor("#FFFFFF"))
        pdf.setFont("Helvetica-Bold", 7.5)
        for x, libelle, _ in colonnes:
            pdf.drawString(x + 0.1 * cm, y - 0.28 * cm, libelle.upper())
        return y - 0.9 * cm

    pdf.setFillColor(BLEU)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(marge, y, "Détail individuel")
    y -= 0.8 * cm
    y = dessiner_entete_table()

    libelles_statut = {"non_commence": "En attente", "en_cours": "En cours", "termine": "Terminée"}
    for resultat in rapport.resultats:
        if y < 2.15 * cm:
            _pied_de_page(pdf, largeur, page)
            pdf.showPage()
            page += 1
            y = hauteur - 1.8 * cm
            y = dessiner_entete_table()

        valeurs = [
            _texte_court(f"{resultat.utilisateur_prenom} {resultat.utilisateur_nom}", 27),
            _texte_court(resultat.departement_nom or "Non renseigné", 20),
            _texte_court(resultat.formation_titre, 34),
            f"{resultat.pourcentage}%",
            libelles_statut[resultat.statut],
            resultat.derniere_activite.strftime("%d/%m/%Y %H:%M") if resultat.derniere_activite else "Aucune activité",
            resultat.date_limite.strftime("%d/%m/%Y") if resultat.date_limite else "-",
        ]
        if int(y / cm) % 2 == 0:
            pdf.setFillColor(FOND)
            pdf.rect(marge, y - 0.25 * cm, largeur - 2 * marge, 0.55 * cm, fill=1, stroke=0)
        pdf.setFillColor(TEXTE)
        pdf.setFont("Helvetica", 7.5)
        for (x, _, _), valeur in zip(colonnes, valeurs):
            pdf.drawString(x + 0.1 * cm, y, valeur)
        y -= 0.62 * cm

    if not rapport.resultats:
        pdf.setFillColor(GRIS)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(marge, y, "Aucune progression ne correspond aux filtres sélectionnés.")
    _pied_de_page(pdf, largeur, page)
    pdf.save()
    tampon.seek(0)
    return tampon.getvalue()
