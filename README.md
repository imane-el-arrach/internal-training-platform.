# EXIA Academy

> Plateforme intelligente de gestion, de suivi et de sensibilisation aux formations internes d'EXIA Technologies.

EXIA Academy centralise le cycle complet de formation : gestion des collaborateurs et services, catalogue de formations, consultation de contenus multimédias, suivi de progression, évaluations, certificats, statistiques et assistance intelligente fondée sur les ressources pédagogiques.

Le projet est constitué de deux applications complémentaires : une interface web React/Vite et une API FastAPI connectée à PostgreSQL et `pgvector`.

## Points forts

- Deux espaces sécurisés : **administrateur** et **collaborateur** ;
- Gestion des utilisateurs, services, catégories, formations et contenus ;
- Consultation intégrée de vidéos, PDF et présentations PowerPoint ;
- Suivi individuel de la progression par ressource ;
- Blocage métier du quiz tant que les contenus obligatoires ne sont pas terminés ;
- Questionnaires, banque de questions, résultats et génération de certificats PDF ;
- Vérification publique et partage des certificats ;
- Tableaux de bord, indicateurs et exports CSV, Excel et PDF ;
- Assistant IA contextuel : indexation de contenus PDF/PPTX et recherche sémantique RAG avec PostgreSQL/pgvector et Gemini ;
- Identité visuelle personnalisée aux couleurs d'EXIA Technologies.

## Architecture

```text
Navigateur
    │
    ├── Frontend React + Vite + TypeScript (local) : http://localhost:5173
    │                    │
    │                    │ API REST / JSON + JWT
    │                    ▼
    └── Backend FastAPI + SQLModel (local)   : http://localhost:8000
                         │
                         ├── PostgreSQL dans Docker : données métiers et suivi
                         ├── pgvector   : embeddings et recherche sémantique
                         ├── Stockage local : vidéos, PDF et PPTX téléversés
                         └── Gemini : génération de réponses pour l'assistant IA
```

## Structure du dépôt

```text
Formation_project/
├── backend/                 # API FastAPI, modèles, migrations et scripts
│   ├── app/                 # code applicatif Python
│   ├── alembic/             # historique des migrations de base de données
│   ├── scripts/             # création d'admin et jeux de données locaux
│   ├── docker-compose.yml   # configuration Docker, notamment PostgreSQL
│   └── README.md            # guide technique backend
├── frontend/                # application React/Vite
│   ├── src/                 # pages, composants, layouts, API et routes
│   └── README.md            # guide technique frontend
├── docs/                    # documentation complémentaire
└── README.md                # vue d'ensemble du projet
```

## Démarrage rapide

### 1. Prérequis

- [Node.js](https://nodejs.org/) 20 ou supérieur ;
- Python 3.12 ;
- Docker Desktop et Docker Compose ;
- une clé API Gemini uniquement si l'assistant IA doit être utilisé.

### 2. Démarrer la base PostgreSQL dans Docker

Depuis la racine du projet :

```powershell
cd backend
docker compose up -d db
```

Le port de la base exposé par Docker doit correspondre à `POSTGRES_PORT` dans `backend/.env`. Pour utiliser l'assistant IA, le conteneur PostgreSQL doit inclure l'extension `pgvector`.

### 3. Démarrer le backend localement

Dans un terminal :

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Le backend local est disponible sur `http://localhost:8000` et sa documentation interactive sur `http://localhost:8000/docs`.

> Avant une installation neuve incluant l'assistant IA, vérifiez que PostgreSQL dispose bien de l'extension `pgvector`. La procédure, y compris l'image Docker à utiliser, est expliquée dans le [README backend](backend/README.md#postgresql-et-pgvector).

### 4. Démarrer le frontend localement

Ouvrez un deuxième terminal, depuis la racine du projet :

```powershell
cd frontend
npm install
npm run dev
```

L'interface est disponible sur `http://localhost:5173`.

## Vérifications avant livraison

```powershell
# Frontend
cd frontend
npm run build

# Backend local : vérifier l'état des migrations
cd ..\backend
alembic current
```

## Documentation détaillée

- [Guide frontend](frontend/README.md) : installation, organisation React, routes et règles de contribution ;
- [Guide backend](backend/README.md) : API, Docker, variables d'environnement, migrations et IA ;
- [Architecture frontend détaillée](docs/ARCHITECTURE_FRONTEND.md).
- [Guide de lancement](GUIDE.md) : procédure destinée à l'encadrant pour installer et lancer la plateforme sur une nouvelle machine.


## Équipe et contexte

Projet réalisé dans le cadre d'un stage chez **EXIA Technologies**, pour répondre aux besoins internes de formation, de sensibilisation et de suivi de conformité des collaborateurs.
