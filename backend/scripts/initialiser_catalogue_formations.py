"""Initialise le catalogue de formations prévu dans le cahier de charge.

Le script est idempotent : il crée les éléments absents et met à jour les
formations déjà présentes avec le même titre. Il ne supprime aucune donnée,
ne crée aucun utilisateur, aucune affectation et aucun contenu.

Exécution depuis le dossier backend :
    python scripts/initialiser_catalogue_formations.py
"""

from sqlmodel import Session, select

from app.db.session import engine
from app.models.categorie import Categorie
from app.models.formation import Formation


CATALOGUE = {
    "Cybersécurité": {
        "description": "Réflexes essentiels pour protéger les systèmes, les accès et les usages numériques.",
        "couleur": "#49BFA9",
        "formations": [
            (
                "Sensibilisation à la sécurité des systèmes d'information",
                "Comprendre les principaux risques numériques et adopter les réflexes essentiels pour protéger les systèmes d'information de l'entreprise.",
                45,
            ),
            (
                "Bonnes pratiques informatiques",
                "Appliquer au quotidien les bonnes pratiques d'utilisation du poste de travail, des logiciels et des ressources informatiques.",
                30,
            ),
            (
                "Phishing et ingénierie sociale",
                "Identifier les tentatives de fraude, vérifier les messages suspects et utiliser les bons canaux de signalement.",
                35,
            ),
            (
                "Gestion des mots de passe",
                "Créer, protéger et renouveler des mots de passe robustes, et comprendre l'intérêt de l'authentification multifacteur.",
                25,
            ),
            (
                "Classification des informations",
                "Distinguer les niveaux de sensibilité des informations et appliquer les règles de manipulation, stockage et partage adaptées.",
                30,
            ),
            (
                "Sécurité de la messagerie électronique",
                "Utiliser la messagerie professionnelle de manière sûre et reconnaître les pièces jointes, liens et expéditeurs à risque.",
                25,
            ),
            (
                "Utilisation sécurisée d'Internet",
                "Naviguer de manière responsable, reconnaître les sites non fiables et limiter l'exposition aux risques sur Internet.",
                25,
            ),
            (
                "Télétravail sécurisé",
                "Sécuriser son environnement de travail à distance, ses connexions, ses équipements et les informations traitées hors site.",
                30,
            ),
        ],
    },
    "Protection des données": {
        "description": "Protection, traitement responsable et confidentialité des données de l'entreprise.",
        "couleur": "#5AA9E6",
        "formations": [
            (
                "Protection des données",
                "Comprendre les principes de confidentialité, de minimisation et de protection des données personnelles et professionnelles.",
                40,
            ),
        ],
    },
    "Sécurité incendie": {
        "description": "Prévention des risques incendie et réactions adaptées pour protéger les personnes.",
        "couleur": "#F39C6B",
        "formations": [
            (
                "Sensibilisation à la sécurité incendie",
                "Connaître les principes de prévention, les premiers réflexes et les rôles de chacun face à un départ de feu.",
                30,
            ),
            (
                "Consignes d'évacuation",
                "Connaître les comportements à adopter, les itinéraires d'évacuation et les points de rassemblement en cas d'urgence.",
                20,
            ),
            (
                "Utilisation des extincteurs",
                "Identifier les différents extincteurs et connaître les règles essentielles pour les utiliser sans se mettre en danger.",
                25,
            ),
        ],
    },
}


def obtenir_ou_creer_categorie(session: Session, nom: str, donnees: dict) -> Categorie:
    categorie = session.exec(select(Categorie).where(Categorie.nom == nom)).first()
    if categorie is None:
        categorie = Categorie(nom=nom)

    categorie.description = donnees["description"]
    categorie.couleur = donnees["couleur"]
    session.add(categorie)
    session.flush()
    return categorie


def initialiser_catalogue() -> tuple[int, int]:
    categories_creees = 0
    formations_creees = 0

    with Session(engine) as session:
        for nom_categorie, donnees in CATALOGUE.items():
            categorie_existante = session.exec(
                select(Categorie).where(Categorie.nom == nom_categorie)
            ).first()
            categorie = obtenir_ou_creer_categorie(session, nom_categorie, donnees)
            if categorie_existante is None:
                categories_creees += 1

            for titre, description, duree in donnees["formations"]:
                formation = session.exec(
                    select(Formation).where(Formation.titre == titre)
                ).first()
                if formation is None:
                    formation = Formation(titre=titre, categorie_id=categorie.id)
                    formations_creees += 1

                formation.categorie_id = categorie.id
                formation.description = description
                formation.duree_estimee_minutes = duree
                formation.obligatoire = True
                formation.actif = True
                session.add(formation)

        session.commit()

    return categories_creees, formations_creees


if __name__ == "__main__":
    categories, formations = initialiser_catalogue()
    print(
        "Catalogue EXIA Academy prêt : "
        f"{categories} catégorie(s) créée(s), {formations} formation(s) créée(s)."
    )
