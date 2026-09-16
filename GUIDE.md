# Guide de lancement - EXIA Academy

Ce guide permet de lancer la plateforme EXIA Academy sur une nouvelle machine.


## Prérequis

- Windows 10 ou Windows 11 ;
- Node.js 20 ou supérieur ;
- Python 3.12 ;
- Docker Desktop avec Docker Compose.

L'assistant IA nécessite facultativement une clé Gemini. Elle doit être
configurée localement et ne doit jamais être ajoutée au dépôt.

## 1. Décompresser le projet

Décompresser l'archive dans un dossier simple, par exemple :

```text
C:\Projets\Formation_project
```

Éviter les dossiers contenant des caractères inhabituels ou des chemins trop
longs. Ouvrir ensuite deux terminaux PowerShell dans le dossier du projet.

## 2. Créer les fichiers de configuration locaux

Créer les fichiers locaux à partir des modèles fournis :

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Renseigner dans `backend\.env` un mot de passe PostgreSQL et une `SECRET_KEY`
longue et aléatoire. Ajouter une clé Gemini seulement si l'assistant IA doit
être activé. Ces fichiers restent locaux et ne doivent jamais être versionnés.

## 3. Démarrer PostgreSQL et pgvector

Dans le premier terminal :

```powershell
cd backend
docker compose up -d db
docker compose ps
```

Attendre que le service `db` soit démarré. PostgreSQL et l'extension `pgvector`
sont exécutés dans Docker. L'extension est activée automatiquement lors de la
création d'une base de données neuve.

## 4. Installer et lancer le backend

Toujours dans le dossier `backend` :

```powershell
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Le backend est disponible à l'adresse :

```text
http://localhost:8000
```

Les vérifications utiles sont :

```text
http://localhost:8000/api/health
http://localhost:8000/docs
```

## 5. Installer et lancer le frontend

Dans le second terminal :

```powershell
cd frontend
npm ci
npm run dev
```

Ouvrir ensuite l'adresse indiquée par Vite, généralement :

```text
http://localhost:5173
```

## 6. Jeu de données de démonstration (facultatif)

Si la base est neuve et qu'une démonstration avec utilisateurs, services,
formations, questionnaires et affectations est souhaitée, laisser le frontend
et le backend démarrés. Ouvrir un troisième terminal dans `backend`, activer
l'environnement Python puis lancer :

```powershell
.\venv\Scripts\Activate.ps1
python -m scripts.initialiser_donnees_demonstration
```

Le script ne supprime pas les données existantes. Il est destiné uniquement à
la démonstration ; les comptes et mots de passe créés ne doivent pas être
utilisés dans un environnement de production.


## 7. Vérification finale

Avant toute démonstration, les commandes suivantes doivent réussir :

```powershell
# Dans frontend
npm run build

# Dans backend, avec l'environnement virtuel activé
python -m pip check
alembic current
```
