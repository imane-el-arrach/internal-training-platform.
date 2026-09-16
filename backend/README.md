# Backend — EXIA Academy

API REST de la plateforme EXIA Academy, développée avec **FastAPI**, **SQLModel**, **PostgreSQL**, **Alembic** et **pgvector**.

Le backend centralise les règles métier, l'authentification JWT, les droits d'accès, la persistance des données, le suivi de progression, les évaluations, les certificats, les exports et l'assistant IA.

## Fonctionnalités prises en charge

- authentification et profil utilisateur ;
- gestion des utilisateurs, rôles et départements ;
- catégories, formations, contenus et affectations ;
- progression globale et progression par contenu ;
- questionnaires, questions, banque de questions et tentatives ;
- certificats PDF, partage et vérification publique ;
- notifications, commentaires et réactions ;
- rapports de suivi et exports CSV, Excel et PDF ;
- ingestion de contenus PDF/PPTX, embeddings vectoriels et assistant IA Gemini.

## Prérequis

- Python 3.12, pour exécuter l'API localement ;
- Docker Desktop et Docker Compose, utilisés pour exécuter PostgreSQL ;
- PostgreSQL 16 avec l'extension `pgvector` pour les fonctions d'indexation IA ;
- une clé Gemini facultative : sans elle, les fonctions d'administration et de formation fonctionnent, mais pas la génération de réponses IA.

## Configuration

Créer le fichier `backend/.env` en copiant `backend/.env.example`. Les valeurs suivantes sont des exemples locaux : elles ne doivent pas être utilisées en production.

```env
POSTGRES_USER=exia_user
POSTGRES_PASSWORD=changez_ce_mot_de_passe
POSTGRES_DB=exia_academy
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

SECRET_KEY=remplacez_par_une_valeur_longue_et_aleatoire
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173

UPLOAD_DIR=uploads
TAILLE_MAX_FICHIER_MO=200
PUBLIC_CERTIFICATE_URL=http://localhost:5173/certificats

GOOGLE_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

> Le fichier `.env` est ignoré par Git. Ne le versionnez jamais.

## Installation locale de l'API avec PostgreSQL dans Docker

Dans la configuration de développement du projet, seul PostgreSQL est exécuté dans Docker. L'API FastAPI est lancée localement avec Uvicorn et le frontend React/Vite est également local.

### 1. Préparer la configuration

Depuis le dossier `backend` :

```powershell
Copy-Item .env.example .env
```

Renseigner ensuite les secrets dans `.env`. S'il existe déjà, ne pas l'écraser : vérifiez simplement que les variables nécessaires sont présentes.

### 2. Démarrer PostgreSQL et pgvector dans Docker

Le projet stocke des embeddings de dimension 384 dans PostgreSQL. Une installation complète doit donc utiliser une image PostgreSQL contenant l'extension `pgvector`.

Dans `docker-compose.yml`, vérifier que le service `db` utilise une image compatible, par exemple :

```yaml
image: pgvector/pgvector:pg16
```

Puis démarrer uniquement la base de données :

```powershell
docker compose up -d db
docker compose ps
```

Pour une base Docker neuve, l'extension `vector` est activée automatiquement
par le script d'initialisation fourni avec Docker Compose, avant l'exécution de
`alembic upgrade head`.

Le port exposé par le conteneur doit correspondre à `POSTGRES_PORT` dans le fichier `.env` du backend. Par exemple, si le conteneur expose PostgreSQL sur le port hôte `5433`, définir `POSTGRES_PORT=5433`.

### 3. Lancer le backend localement

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

L'option `--reload` recharge automatiquement l'API après une modification de code.

### 4. Appliquer les migrations

```powershell
alembic upgrade head
alembic current
```

### 5. Créer le premier administrateur

Le script est interactif et refuse de créer un deuxième administrateur si un compte administrateur existe déjà.

```powershell
python scripts/creer_premier_admin.py
```

### 6. Vérifier l'API

- Santé : `http://localhost:8000/api/health`
- Documentation Swagger : `http://localhost:8000/docs`
- Documentation ReDoc : `http://localhost:8000/redoc`

Pour consulter les journaux :

```powershell
# Journaux de PostgreSQL dans Docker
docker compose logs -f db
```

Pour arrêter les conteneurs sans supprimer les données :

```powershell
docker compose down
```

> Le fichier `docker-compose.yml` contient aussi une définition facultative du backend. Elle peut être utilisée pour une conteneurisation complète, mais ce n'est pas le mode de développement local décrit dans ce README.

## PostgreSQL et pgvector

`pgvector` est utilisé pour l'assistant IA : les textes extraits des PDF et présentations sont découpés en fragments, convertis en embeddings puis stockés dans la table des fragments de contenu. Lorsqu'un collaborateur pose une question, seuls les fragments les plus proches sont sélectionnés pour constituer le contexte envoyé à Gemini.

Cette approche RAG évite d'envoyer tout un document au modèle à chaque question, réduit le volume de tokens et permet de répondre à partir du contenu réel de la formation.

Si la migration liée aux vecteurs échoue avec une erreur indiquant que le type `vector` est introuvable, vérifier :

1. que le conteneur PostgreSQL utilise une image avec `pgvector` ;
2. pour un volume PostgreSQL déjà existant, exécuter `CREATE EXTENSION IF NOT EXISTS vector;` dans la base ;
3. que les migrations sont appliquées avec `alembic upgrade head`.

## Organisation du code

```text
backend/
├── app/
│   ├── api/
│   │   ├── deps.py           # dépendances d'authentification et permissions
│   │   └── routes/           # endpoints REST par domaine métier
│   ├── core/                 # paramètres, sécurité et JWT
│   ├── db/                   # moteur et sessions SQLModel
│   ├── models/               # modèles de base de données
│   ├── schemas/              # schémas de requêtes et réponses API
│   ├── services/             # ingestion, RAG, LLM, certificats, exports
│   └── main.py               # point d'entrée FastAPI
├── alembic/                  # migrations de base de données
├── scripts/                  # scripts utilitaires locaux
├── uploads/                  # ressources téléversées, non versionnées
├── requirements.txt          # dépendances Python
├── docker-compose.yml        # services Docker locaux
└── Dockerfile                # image de l'API
```

## Principaux domaines API

| Domaine | Exemples de responsabilités |
| --- | --- |
| Authentification | connexion, JWT, profil connecté |
| Utilisateurs et départements | population, rôles, services |
| Formations et contenus | catalogue, téléversement, prévisualisation, indexation |
| Affectations et progressions | parcours individuels ou par service, avancement |
| Évaluations | questionnaires, questions, tentatives, résultats |
| Certificats et rapports | vérification publique, PDF, CSV, Excel |
| Assistant IA | recherche sémantique, génération, résumés et quiz proposés |

## Règles de sécurité importantes

- les mots de passe sont hachés côté serveur ;
- les endpoints protégés exigent un jeton JWT ;
- les autorisations administrateur sont vérifiées côté API ;
- le contrôle de complétion des contenus avant le quiz est appliqué par le backend ;
- les fichiers téléversés, les secrets et les bases locales ne sont pas versionnés.

## Commandes utiles

```powershell
# Vérifier la révision Alembic courante depuis l'environnement Python local
alembic current

# Créer une migration après une évolution de modèle
alembic revision --autogenerate -m "description_de_la_modification"

# Appliquer les migrations
alembic upgrade head

# Suivre les journaux de PostgreSQL dans Docker
docker compose logs -f db
```

Pour lancer le frontend, consulter le [README frontend](../frontend/README.md).
