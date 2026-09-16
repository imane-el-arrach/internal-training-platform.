-- Exécuté par l'image PostgreSQL uniquement lors de l'initialisation d'un
-- volume de données neuf. Les migrations Alembic peuvent ensuite créer la
-- colonne embedding vector(384).
CREATE EXTENSION IF NOT EXISTS vector;
