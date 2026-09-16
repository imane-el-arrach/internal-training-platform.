import getpass
from sqlmodel import Session, select
import app.models
from app.core.security import hash_mot_de_passe
from app.db.session import engine
from app.models.utilisateur import RoleUtilisateur, Utilisateur


def main() -> None:
    with Session(engine) as session:
        existe_deja = session.exec(
            select(Utilisateur).where(Utilisateur.role == RoleUtilisateur.administrateur)
        ).first()
        if existe_deja is not None:
            print("Un administrateur existe déjà — arrêt du script.")
            return

        email = input("Email de l'administrateur : ").strip()
        nom = input("Nom : ").strip()
        prenom = input("Prénom : ").strip()
        mot_de_passe = getpass.getpass("Mot de passe : ")

        admin = Utilisateur(
            nom=nom,
            prenom=prenom,
            email=email,
            mot_de_passe_hash=hash_mot_de_passe(mot_de_passe),
            role=RoleUtilisateur.administrateur,
        )
        session.add(admin)
        session.commit()
        print(f"Administrateur {email} créé avec succès.")


if __name__ == "__main__":
    main()
