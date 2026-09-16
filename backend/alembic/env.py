from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from app.core.config import settings

# Importer tous les modèles pour qu'Alembic détecte les tables à autogénérer
from app.models.departement import Departement  # noqa: F401
from app.models.utilisateur import Utilisateur  # noqa: F401
from app.models.categorie import Categorie  # noqa: F401
from app.models.formation import Formation  # noqa: F401
from app.models.contenu import Contenu  # noqa: F401
from app.models.affectation import Affectation  # noqa: F401
from app.models.progression import Progression  # noqa: F401
from app.models.questionnaire import Questionnaire  # noqa: F401
from app.models.question import Question  # noqa: F401
from app.models.reponse_possible import ReponsePossible  # noqa: F401
from app.models.tentative import Tentative  # noqa: F401
from app.models.reponse_utilisateur import ReponseUtilisateur  # noqa: F401
from app.models.certificat import Certificat  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.contenu_chunk import ContenuChunk
from app.models.commentaire import Commentaire  # noqa: F401
from app.models.progression_contenu import ProgressionContenu  # noqa: F401
from app.models.question_banque import QuestionBanque, ReponseBanque  # noqa: F401
config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
