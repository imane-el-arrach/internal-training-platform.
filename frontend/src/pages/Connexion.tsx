import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ExternalLink, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Connexion.css";

export function Connexion() {
  const { seConnecter } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function gererSoumission(event: FormEvent) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      const profil = await seConnecter(email, motDePasse);

      navigate(profil.role === "administrateur" ? "/admin" : "/espace", {
        replace: true,
      });
    } catch (error) {
      setErreur(
        error instanceof Error
          ? error.message
          : "Connexion impossible. Vérifiez vos identifiants."
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <Link to="/" className="app-logo" aria-label="EXIA Academy, accueil">
          <img src="/logo-exia.png" alt="EXIA Technologies" />
          <span>
            <strong>EXIA</strong>
            <small>ACADEMY</small>
          </span>
        </Link>

        <div className="login-copy">
          <span className="section-kicker">
            <i /> ESPACE SÉCURISÉ
          </span>

          <h1>
            Bienvenue sur
            <br />
            <em>EXIA Academy.</em>
          </h1>

          <p>
            Connectez-vous pour retrouver vos formations, suivre votre
            progression et développer vos compétences.
          </p>
        </div>

        <form className="login-form" onSubmit={gererSoumission}>
          <label>
            Adresse professionnelle
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom.nom@exia.fr"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Mot de passe
            <span className="password-field">
              <input
                type="password"
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <ShieldCheck size={16} />
            </span>
          </label>

          {erreur && (
            <p className="form-error" role="alert">
              {erreur}
            </p>
          )}

          <button className="button login-submit" type="submit" disabled={enCours}>
            {enCours ? "Connexion en cours…" : "Se connecter"}
            {!enCours && <ArrowRight size={17} />}
          </button>

          <button
            className="text-link login-help"
            type="button"
            onClick={() =>
              setErreur("Contactez votre administrateur si vous ne pouvez pas vous connecter.")
            }
          >
            Un problème pour vous connecter ?
          </button>
        </form>

        <footer className="login-footer">
          <span>Données protégées et accès réservé aux collaborateurs.</span>
          <a href="https://www.exiatechnologies.com/" target="_blank" rel="noreferrer">Site officiel EXIA <ExternalLink size={12} /></a>
          <a href="https://maps.google.com/?q=Rue+Pierre+Parent,+Casablanca+20250" target="_blank" rel="noreferrer"><MapPin size={12} /> Casablanca 20250</a>
        </footer>
      </section>

      <aside className="login-art">
        <img src="/images/exia/accueil-exia.jpeg" alt="Locaux EXIA Technologies" />
      </aside>
    </main>
  );
}
