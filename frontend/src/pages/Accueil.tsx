import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Bot,
  CirclePlay,
  Clock3,
  ClipboardList,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import "./Accueil.css";

// Contenu réel de la plateforme (repris tel quel de l'ancienne page — ce
// n'est que l'habillage visuel qui change, pas ce qui est annoncé).
const ETAPES = [
  {
    numero: "01",
    titre: "Formation affectée",
    texte: "Chaque collaborateur reçoit les formations qui le concernent, individuellement ou par service.",
    icone: ClipboardList,
  },
  {
    numero: "02",
    titre: "Contenu et assistant",
    texte: "Vidéos, documents et présentations, avec un assistant IA pour résumer, expliquer ou répondre aux questions.",
    icone: Bot,
  },
  {
    numero: "03",
    titre: "Évaluation",
    texte: "Un quiz valide la compréhension, avec un nombre de tentatives et un temps définis par formation.",
    icone: ShieldCheck,
  },
  {
    numero: "04",
    titre: "Certificat vérifiable",
    texte: "Une fois réussi, un certificat est délivré et peut être partagé via un lien de vérification public.",
    icone: Award,
  },
];

const FONCTIONNALITES = [
  {
    titre: "Formations centralisées",
    texte: "Toutes les formations obligatoires de l'entreprise réunies dans un seul espace.",
    icone: LayoutDashboard,
  },
  {
    titre: "Suivi de conformité",
    texte: "Visibilité en temps réel sur qui a terminé quoi, par formation et par département.",
    icone: Clock3,
  },
  {
    titre: "Assistant intelligent",
    texte: "Un assistant qui s'appuie uniquement sur le contenu réel des formations, jamais d'information inventée.",
    icone: Bot,
  },
  {
    titre: "Certificats vérifiables",
    texte: "Chaque certificat dispose d'un lien public de vérification, consultable sans compte.",
    icone: ShieldCheck,
  },
];


const LOGO_URL = "/logo-exia.png";

function AcademyLogo() {
  return (
    <Link
      to="/"
      className="academy-logo"
      aria-label="EXIA Academy, accueil"
      onClick={(event) => {
        event.preventDefault();
        window.location.reload();
      }}
    >
      <img className="academy-logo__official" src={LOGO_URL} alt="EXIA Technologies" />
      <span className="academy-logo__copy">
        <strong>EXIA</strong>
        <span>ACADEMY</span>
      </span>
    </Link>
  );
}

function ExiaVisual() {
  return (
    <div className="exia-hero-visual" aria-label="EXIA Technologies et ses équipes en formation">
      <figure className="exia-hero-visual__main">
        <img src="/images/exia/accueil-exia.jpeg" alt="Espaces EXIA Technologies" />
        <figcaption>EXIA TECHNOLOGIES</figcaption>
      </figure>
      <figure className="exia-hero-visual__training">
        <img src="/images/exia/formation-groupe.jpeg" alt="Équipe EXIA réunie lors d'une formation" />
        <figcaption>APPRENDRE ENSEMBLE</figcaption>
      </figure>
      <div className="exia-hero-visual__badge"><strong>EXIA Academy</strong><span>Développer les compétences, chaque jour.</span></div>
    </div>
  );
}

export function Accueil() {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="exia-home" id="top">
      <header className="site-header">
        <div className="container header-inner">
          <AcademyLogo />
          <div className="header-context">
            Plateforme interne de formation<br className="desktop-only" /> et de sensibilisation
          </div>
          <nav className={`site-nav ${menuOuvert ? "site-nav--open" : ""}`} aria-label="Navigation principale">
            <a href="#parcours" onClick={() => setMenuOuvert(false)}>Le parcours</a>
            <a href="#fonctionnalites" onClick={() => setMenuOuvert(false)}>Fonctionnalités</a>
            <a className="header-exia" href="https://www.exiatechnologies.com/" target="_blank" rel="noreferrer">EXIA Technologies <ExternalLink size={13} /></a>
            <Link className="header-login" to="/connexion" onClick={() => setMenuOuvert(false)}>
              Se connecter <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </nav>
          <button
            className="mobile-menu"
            type="button"
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOuvert}
            onClick={() => setMenuOuvert(!menuOuvert)}
          >
            {menuOuvert ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero container">
          <div className="hero-copy">
            <span className="section-kicker"><i /> EXIA ACADEMY</span>
            <h1>
              Apprendre,<br /><em>progresser,</em><br />se certifier.
            </h1>
            <p className="hero-intro">
              EXIA Academy centralise les formations obligatoires de l'entreprise — cybersécurité,
              sécurité incendie, protection des données — avec un parcours accompagné par une
              assistance intelligente fidèle au contenu réel des formations.
            </p>
            <div className="hero-actions">
              <Link className="button button--primary" to="/connexion">
                Accéder à mon espace <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a className="text-link" href="#parcours">
                <CirclePlay size={16} aria-hidden="true" /> Découvrir le parcours
              </a>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars"><span>O</span><span>M</span><span>A</span><span>+</span></div>
              <span>Un espace conçu pour apprendre<br />simplement, au quotidien.</span>
            </div>
          </div>
          <ExiaVisual />
        </section>

        <section className="journey-section" id="parcours">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker"><i /> COMMENT ÇA MARCHE</span>
                <h2>Un parcours qui vous<br /><em>accompagne</em> vraiment.</h2>
              </div>
              <p>De la première vidéo jusqu'à la certification, chaque étape est pensée pour vous aider à progresser avec clarté.</p>
            </div>
            <div className="journey-grid">
              {ETAPES.map((etape) => {
                const Icone = etape.icone;
                return (
                  <div className="journey-item" key={etape.numero}>
                    <div className="journey-item__top">
                      <span>{etape.numero}</span>
                      <Icone size={21} aria-hidden="true" />
                    </div>
                    <h3>{etape.titre}</h3>
                    <p>{etape.texte}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="features-section" id="fonctionnalites">
          <div className="container">
            <div className="section-heading section-heading--features">
              <div>
                <h2>Tout ce dont vous avez<br /><em>besoin pour avancer.</em></h2>
              </div>
              <p>Une expérience pensée pour rendre le suivi des formations plus simple, pour vous comme pour vos équipes.</p>
            </div>
            <div className="features-grid">
              {FONCTIONNALITES.map((f) => {
                const Icone = f.icone;
                return (
                  <article className="feature-card" key={f.titre}>
                    <div className="feature-icon"><Icone size={21} aria-hidden="true" /></div>
                    <h3>{f.titre}</h3>
                    <p>{f.texte}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="exia-life-section">
          <div className="container exia-life-grid">
            <div className="exia-life-photo">
              <img src="/images/exia/formation-equipe.jpeg" alt="Session de formation chez EXIA Technologies" />
              <span>EXIA TECHNOLOGIES · TRANSMETTRE ET PROGRESSER</span>
            </div>
            <div className="exia-life-copy">
              <span className="section-kicker"><i /> L'ESPRIT EXIA</span>
              <h2>La formation, au plus près<br /><em>de nos équipes.</em></h2>
              <p>EXIA Academy s'inscrit dans le quotidien des collaborateurs : apprendre ensemble, développer les bons réflexes et faire grandir une culture commune de la sécurité.</p>
              <a className="text-link exia-site-link" href="https://www.exiatechnologies.com/" target="_blank" rel="noreferrer">
                Découvrir EXIA Technologies <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="assistant-section">
          <div className="container assistant-inner">
            <div className="assistant-art">
              <div className="assistant-ring"><Bot size={34} aria-hidden="true" /></div>
              <div className="assistant-pulse assistant-pulse--one" />
              <div className="assistant-pulse assistant-pulse--two" />
            </div>
            <div className="assistant-copy">
              <span className="section-kicker section-kicker--light"><i /> VOTRE ASSISTANT INTELLIGENT</span>
              <h2>Une question sur votre formation ?<br /><em>Il a déjà la réponse.</em></h2>
              <p>
                L'assistant vous aide à comprendre, résumer et interroger les contenus réels de vos
                formations. Une aide disponible quand vous en avez besoin, sans jamais perdre le fil
                de votre apprentissage.
              </p>
              <Link className="button button--light" to="/connexion">
                Accéder à mon espace <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-main">
          <div><AcademyLogo /><p>Un espace pour apprendre, progresser et se certifier.</p></div>
          <div className="footer-contact">
            <span className="footer-label">CONTACT EXIA</span>
            <a href="https://maps.google.com/?q=Rue+Pierre+Parent,+Casablanca+20250" target="_blank" rel="noreferrer"><MapPin size={14} /> Rue Pierre Parent, Casablanca 20250</a>
            <a href="tel:+212522464340"><Phone size={14} /> +212 (0) 522 464 340</a>
            <a href="mailto:info@exia.ma"><Mail size={14} /> info@exia.ma</a>
          </div>
          <div className="footer-links"><a href="https://www.exiatechnologies.com/" target="_blank" rel="noreferrer">Site officiel <ExternalLink size={13} /></a><span>© {new Date().getFullYear()} EXIA Technologies</span></div>
        </div>
      </footer>
    </div>
  );
}
