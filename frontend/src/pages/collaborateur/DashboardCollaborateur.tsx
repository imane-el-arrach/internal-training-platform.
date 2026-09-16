import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, BookOpen, Clock3, Sparkles } from "lucide-react";
import { mesProgressions } from "../../api/affectations";
import { listerCategories, listerFormations } from "../../api/formations";
import { useAuth } from "../../context/AuthContext";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";
import { formaterDureeFormation } from "../../lib/duree";

export function DashboardCollaborateur() {
  const { utilisateur } = useAuth();

  const { data: progressions = [], isLoading: chargeProgressions } = useQuery({
    queryKey: ["mes-progressions"],
    queryFn: mesProgressions,
  });

  const { data: formations = [], isLoading: chargeFormations } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listerCategories,
  });

  const chargement = chargeProgressions || chargeFormations;

  const formationsAssociees = progressions
    .map((progression) => ({
      progression,
      formation: formations.find((formation) => formation.id === progression.formation_id),
    }))
    .filter((element) => element.formation !== undefined);

  const enCours =
    formationsAssociees.find((element) => element.progression.statut === "en_cours") ??
    formationsAssociees.find((element) => element.progression.statut === "non_commence");

  const terminees = progressions.filter(
    (progression) => progression.statut === "termine"
  ).length;

  const progressionMoyenne =
    progressions.length === 0
      ? 0
      : Math.round(
          progressions.reduce((total, progression) => total + progression.pourcentage, 0) /
            progressions.length
        );

  const dureeEstimeeMinutes = formationsAssociees.reduce(
    (total, element) => total + (element.formation?.duree_estimee_minutes ?? 0),
    0
  );

  const duree = formaterDureeFormation(dureeEstimeeMinutes);

  if (chargement) {
    return <LoadingState message="Chargement de votre espace…" />;
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <span className="section-kicker">
            <i /> MON ESPACE
          </span>

          <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-6xl">
            Bonjour, {utilisateur?.prenom ?? "collaborateur"} <em className="text-[#49bfa9]">↗</em>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-ink/60">
            Continuez votre parcours là où vous l’avez laissé.
          </p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-full bg-[#315864] text-sm font-bold text-white">
          {utilisateur?.prenom?.charAt(0).toUpperCase() ?? "E"}
        </div>
      </div>

      <div className="mt-10 flex items-center gap-3 rounded-lg bg-[#315864] p-[18px] text-white">
        <Sparkles size={21} className="text-[#49bfa9]" />
        <div className="flex flex-col gap-1">
          <strong className="text-xs">Votre parcours avance bien.</strong>
          <span className="text-[11px] text-white/75">
            {terminees} formation(s) terminée(s) sur {progressions.length}.
          </span>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-[-0.04em] text-ink">
          Votre progression
        </h2>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard
            label="FORMATIONS"
            valeur={`${terminees}/${progressions.length}`}
            detail={`${progressions.length - terminees} à poursuivre`}
            icon={<BookOpen size={18} />}
          />
          <StatCard
            label="PROGRESSION MOYENNE"
            valeur={`${progressionMoyenne}%`}
            detail="sur vos formations affectées"
            icon={<Sparkles size={18} />}
          />
          <StatCard
            label="DURÉE ESTIMÉE"
            valeur={duree}
            detail="de contenus disponibles"
            icon={<Clock3 size={18} />}
          />
        </div>
      </section>

      <section className="mt-11">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-medium tracking-[-0.04em] text-ink">
            Reprendre votre formation
          </h2>

          <Link
            to="/espace/formations"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#315864]"
          >
            Voir toutes les formations <ArrowRight size={15} />
          </Link>
        </div>

        {enCours?.formation ? (
          <Link
            to={`/espace/formations/${enCours.formation.id}`}
            className="mt-5 flex items-center gap-4 rounded-lg border border-line bg-white p-3 transition hover:border-[#315864]"
          >
            <div className="grid h-16 w-16 place-items-center rounded-md bg-[#e7f0ef] text-[#315864]">
              <BookOpen size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
                {categories.find((categorie) => categorie.id === enCours.formation?.categorie_id)
                  ?.nom ?? "FORMATION"}
              </span>

              <h3 className="mt-1 truncate text-sm font-bold text-ink">
                {enCours.formation.titre}
              </h3>

              <p className="mt-1 text-[11px] text-ink/55">
                {enCours.progression.statut === "en_cours" ? "En cours" : "À commencer"}
              </p>
            </div>

            <div className="w-28">
              <span className="mb-1 block text-right text-[10px] text-ink/55">
                {enCours.progression.pourcentage}%
              </span>
              <div className="h-1 overflow-hidden rounded-full bg-[#e7f0ef]">
                <span
                  className="block h-full rounded-full bg-[#49bfa9]"
                  style={{ width: `${enCours.progression.pourcentage}%` }}
                />
              </div>
            </div>

            <ArrowRight size={17} className="text-[#315864]" />
          </Link>
        ) : (
          <EmptyState
            icon={<BookOpen size={22} />}
            titre="Aucune formation affectée"
            message="Vos formations assignées apparaîtront ici dès qu'un administrateur vous en affectera une."
          />
        )}
      </section>

      <section className="mt-11">
        <h2 className="font-display text-xl font-medium tracking-[-0.04em] text-ink">
          Accès rapides
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <QuickLink
            to="/espace/formations"
            icon={<BookOpen size={21} />}
            titre="Mes formations"
            detail="Voir les parcours disponibles"
          />
          <QuickLink
            to="/espace/certificats"
            icon={<Award size={21} />}
            titre="Mes certificats"
            detail="Retrouver vos réussites"
          />
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
  valeur: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="flex items-center justify-between text-[#315864]">
        <span className="text-[9px] font-bold tracking-[0.12em]">{label}</span>
        {icon}
      </div>
      <strong className="mt-3 block text-3xl font-semibold tracking-[-0.06em] text-[#315864]">
        {valeur}
      </strong>
      <small className="mt-2 block text-[11px] text-ink/55">{detail}</small>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  titre,
  detail,
}: {
  to: string;
  icon: React.ReactNode;
  titre: string;
  detail: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-lg border border-line bg-white p-5 text-[#315864] transition hover:border-[#315864]"
    >
      {icon}
      <strong className="text-sm text-ink">{titre}</strong>
      <small className="text-[11px] text-ink/55">{detail}</small>
    </Link>
  );
}
