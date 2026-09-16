import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { listerAffectations } from "../../api/affectations";
import { listerCertificatsAdmin } from "../../api/assistant";
import { listerFormations } from "../../api/formations";
import { consulterRapportSuivi } from "../../api/rapports";
import { listerUtilisateurs } from "../../api/utilisateurs";

export function DashboardAdmin() {
  const { data: utilisateurs = [] } = useQuery({
    queryKey: ["utilisateurs-actifs"],
    queryFn: () => listerUtilisateurs(true),
  });

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  const { data: rapport } = useQuery({
    queryKey: ["rapport-suivi"],
    queryFn: () => consulterRapportSuivi(),
  });

  const { data: certificats = [] } = useQuery({
    queryKey: ["certificats-admin"],
    queryFn: listerCertificatsAdmin,
  });

  const { data: affectations = [] } = useQuery({
    queryKey: ["affectations"],
    queryFn: () => listerAffectations(),
  });

  return (
    <div>
      <div className="max-w-2xl">
        <span className="section-kicker">
          <i /> PILOTAGE ADMINISTRATEUR
        </span>

        <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-6xl">
          Vue d’ensemble
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-ink/60">
          Pilotez l’apprentissage, l’engagement et la progression de vos équipes.
        </p>
      </div>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="COLLABORATEURS ACTIFS"
          valeur={utilisateurs.length}
          detail="comptes actifs sur la plateforme"
          icon={<Users size={19} />}
        />

        <StatCard
          label="TAUX DE COMPLÉTION"
          valeur={rapport ? `${rapport.taux_completion}%` : "—"}
          detail={rapport ? `${rapport.progressions_terminees} progression(s) terminée(s)` : "calcul en cours"}
          icon={<Sparkles size={19} />}
        />

        <StatCard
          label="TAUX DE RÉUSSITE"
          valeur={rapport?.taux_reussite === null || !rapport ? "—" : `${rapport.taux_reussite}%`}
          detail="dernières tentatives de quiz"
          icon={<CheckCircle2 size={19} />}
        />

        <StatCard
          label="CONFORMITÉ"
          valeur={rapport?.taux_conformite === null || !rapport ? "—" : `${rapport.taux_conformite}%`}
          detail="formations obligatoires terminées"
          icon={<ShieldCheck size={19} />}
        />

        <StatCard
          label="AFFECTATIONS À DÉMARRER"
          valeur={rapport ? rapport.formations_en_attente : "—"}
          detail="parcours affectés et non commencés"
          icon={<Clock3 size={19} />}
        />

        <StatCard
          label="CERTIFICATS ÉMIS"
          valeur={certificats.length}
          detail="certificats obtenus par les collaborateurs"
          icon={<Award size={19} />}
        />
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.45fr_0.8fr]">
        <article className="rounded-xl bg-[#315864] p-7 text-white">
          <span className="text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
            SUIVI DES PARCOURS
          </span>

          <h2 className="mt-4 font-display text-3xl font-medium tracking-[-0.05em]">
            {rapport?.progressions_total ?? 0} progression(s)
            <br />
            en cours de suivi.
          </h2>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">
            Consultez les formations, affectez les bons parcours aux équipes et
            accompagnez les collaborateurs dans leur progression.
          </p>

          <Link
            to="/admin/resultats"
            className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#49bfa9] px-4 py-3 text-xs font-bold text-[#17313a]"
          >
            Consulter les résultats
            <ArrowRight size={15} />
          </Link>
        </article>

        <article className="rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
            Actions rapides
          </h2>

          <div className="mt-5 space-y-2">
            <ActionRapide
              to="/admin/utilisateurs"
              icon={<Users size={17} />}
              texte="Créer un utilisateur"
            />

            <ActionRapide
              to="/admin/formations"
              icon={<BookOpen size={17} />}
              texte="Créer une formation"
            />

            <ActionRapide
              to="/admin/affectations"
              icon={<Sparkles size={17} />}
              texte="Affecter une formation"
            />

            <ActionRapide
              to="/admin/resultats"
              icon={<BarChart3 size={17} />}
              texte="Consulter les résultats"
            />
          </div>
        </article>
      </section>

      <section className="mt-10 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
              Affectations récentes
            </h2>
            <p className="mt-1 text-xs text-ink/55">
              Les dernières attributions de formations.
            </p>
          </div>

          <Link
            to="/admin/affectations"
            className="text-xs font-bold text-[#315864]"
          >
            Tout voir
          </Link>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white">
          {affectations.slice(0, 5).map((affectation) => {
            const formation = formations.find(
              (element) => element.id === affectation.formation_id
            );

            return (
              <div
                key={affectation.id}
                className="flex items-center justify-between gap-5 border-b border-line px-5 py-4 last:border-0"
              >
                <div>
                  <strong className="block text-sm text-ink">
                    {formation?.titre ?? "Formation"}
                  </strong>

                  <span className="mt-1 block text-[11px] text-ink/55">
                    {affectation.nombre_progressions_generees} collaborateur(s) concerné(s)
                  </span>
                </div>

                <span className="rounded-full bg-[#e7f0ef] px-3 py-1.5 text-[10px] font-bold text-[#315864]">
                  Affectée
                </span>
              </div>
            );
          })}

          {affectations.length === 0 && (
            <p className="p-6 text-sm text-ink/55">
              Aucune affectation pour le moment.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  valeur,
  detail,
  icon,
}: {
  label: string;
  valeur: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-center justify-between text-[#315864]">
        <span className="text-[9px] font-bold tracking-[0.13em]">{label}</span>
        {icon}
      </div>

      <strong className="mt-4 block text-4xl font-semibold tracking-[-0.06em] text-[#315864]">
        {valeur}
      </strong>

      <small className="mt-2 block text-[11px] text-ink/55">{detail}</small>
    </article>
  );
}

function ActionRapide({
  to,
  icon,
  texte,
}: {
  to: string;
  icon: React.ReactNode;
  texte: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm text-[#315864] transition hover:border-[#49bfa9] hover:bg-[#e7f0ef]"
    >
      {icon}
      <span className="flex-1 font-semibold text-ink">{texte}</span>
      <ArrowRight size={15} />
    </Link>
  );
}
