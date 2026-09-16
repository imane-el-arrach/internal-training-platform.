"""Copie des ressources phishing déjà présentes vers la formation officielle.

Ce script ne déplace ni ne supprime les fichiers d'origine. Il peut être
relancé sans dupliquer les contenus : les titres servent d'identifiants.

Exécution : python -m scripts.ajouter_contenus_phishing
"""

import shutil
import uuid
from pathlib import Path

from sqlmodel import Session, select

from app.db.session import engine
from app.models.contenu import Contenu, TypeContenu
from app.models.formation import Formation


FORMATION_TITRE = "Phishing et ingénierie sociale"
RESSOURCES = [
    ("Mémo - lutter contre le phishing", "Lutter-contre-le-PHISHING.pdf", TypeContenu.pdf, 12 * 60),
    ("Présentation - reconnaître le phishing", "phishing-training.pptx", TypeContenu.presentation, 15 * 60),
]


def trouver_source(nom: str) -> Path:
    fichiers = list(Path("uploads").glob(f"formations/**/*{nom}"))
    if not fichiers:
        raise FileNotFoundError(f"Ressource source introuvable : {nom}")
    return fichiers[0]


def ajouter_contenus() -> int:
    with Session(engine) as session:
        formation = session.exec(
            select(Formation).where(Formation.titre == FORMATION_TITRE)
        ).first()
        if formation is None:
            raise RuntimeError(f"Formation introuvable : {FORMATION_TITRE}")

        ordre = max(
            (contenu.ordre for contenu in session.exec(select(Contenu).where(Contenu.formation_id == formation.id)).all()),
            default=0,
        )
        ajoutes = 0

        destination_dir = Path("uploads") / "formations" / str(formation.id)
        destination_dir.mkdir(parents=True, exist_ok=True)

        for titre, nom_source, type_contenu, duree in RESSOURCES:
            existe = session.exec(
                select(Contenu).where(
                    Contenu.formation_id == formation.id,
                    Contenu.titre == titre,
                )
            ).first()
            if existe is not None:
                continue

            source = trouver_source(nom_source)
            destination = destination_dir / f"{uuid.uuid4().hex}_{nom_source}"
            shutil.copy2(source, destination)

            ordre += 1
            session.add(
                Contenu(
                    formation_id=formation.id,
                    type=type_contenu,
                    titre=titre,
                    chemin_fichier=f"formations/{formation.id}/{destination.name}",
                    ordre=ordre,
                    duree_secondes=duree,
                )
            )
            ajoutes += 1

        session.commit()
    return ajoutes


if __name__ == "__main__":
    print(f"{ajouter_contenus()} contenu(s) ajouté(s) à « {FORMATION_TITRE} ».")
