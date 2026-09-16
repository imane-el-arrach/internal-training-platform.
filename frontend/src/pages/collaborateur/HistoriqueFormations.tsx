import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, History } from "lucide-react";
import { mesProgressions } from "../../api/affectations";
import { listerCategories, listerFormations } from "../../api/formations";
import type { Categorie, Formation, Progression } from "../../api/types";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";
import { formaterDureeFormation } from "../../lib/duree";

type Filtre = "Toutes" | "Terminées" | "En cours";

type ElementHistorique = {
  formation: Formation;
  progression: Progression;
  categorie?: Categorie;
};

function dateLisible(date: string | null) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function HistoriqueFormations() {
  const [filtre, setFiltre] = useState<Filtre>("Toutes");

  const { data: progressions = [], isLoading: chargeProgressions, error } = useQuery({
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

  const historique = useMemo<ElementHistorique[]>(() => {
    return progressions
      .filter((progression) => progression.statut !== "non_commence")
      .flatMap((progression) => {
        const formation = formations.find((element) => element.id === progression.formation_id);
        if (!formation) return [];

        return [{
          formation,
          progression,
          categorie: categories.find((categorie) => categorie.id === formation.categorie_id),
        }];
      })
      .sort((a, b) => {
        const dateA = a.progression.date_fin ?? a.progression.derniere_activite ?? a.progression.date_debut ?? "";
        const dateB = b.progression.date_fin ?? b.progression.derniere_activite ?? b.progression.date_debut ?? "";
        return dateB.localeCompare(dateA);
      });
  }, [categories, formations, progressions]);

  const elements = historique.filter(({ progression }) => {
    if (filtre === "Toutes") return true;
    if (filtre === "Terminées") return progression.statut === "termine";
    return progression.statut === "en_cours";
  });

  const terminees = historique.filter(({ progression }) => progression.statut === "termine").length;
  const enCours = historique.filter(({ progression }) => progression.statut === "en_cours").length;
  const charge = chargeProgressions || chargeFormations;

  return (
    <div className="max-w-4xl">
      <span className="section-kicker"><i /> MON PARCOURS</span>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-6xl">
        Historique des formations
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/60">
        Retrouvez les formations commencées et terminées, avec leur dernière activité.
      </p>

      <div className="mt-9 grid gap-3 sm:grid-cols-2">
        <Resume label="FORMATIONS TERMINÉES" valeur={terminees} icon={<CheckCircle2 size={18} />} />
        <Resume label="FORMATIONS EN COURS" valeur={enCours} icon={<Clock3 size={18} />} />
      </div>

      <div className="mt-9 flex flex-wrap gap-2">
        {(["Toutes", "Terminées", "En cours"] as Filtre[]).map((element) => (
          <button
            key={element}
            type="button"
            onClick={() => setFiltre(element)}
            className={[
              "rounded-full border px-3 py-2 text-[11px] font-semibold transition-colors",
              filtre === element
                ? "border-[#315864] bg-[#315864] text-white"
                : "border-line bg-white text-ink/55 hover:border-[#315864] hover:text-[#315864]",
            ].join(" ")}
          >
            {element}
          </button>
        ))}
      </div>

      {charge && <LoadingState message="Chargement de votre historique…" />}
      {error && (
        <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger votre historique. Vérifiez que le backend est démarré.
        </p>
      )}

      {!charge && !error && (
        <div className="mt-6 space-y-3">
          {elements.map((element) => <LigneHistorique key={element.progression.id} {...element} />)}
          {elements.length === 0 && (
            <EmptyState
              icon={<History size={22} />}
              titre="Aucun historique"
              message={filtre === "Toutes" ? "Commencez une formation pour la retrouver ici." : "Aucune formation ne correspond à ce filtre."}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Resume({ label, valeur, icon }: { label: string; valeur: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <div className="flex items-center justify-between text-[#315864]">
        <span className="text-[9px] font-bold tracking-[0.12em]">{label}</span>
        {icon}
      </div>
      <strong className="mt-3 block text-3xl font-semibold tracking-[-0.06em] text-[#315864]">{valeur}</strong>
    </div>
  );
}

function LigneHistorique({ formation, progression, categorie }: ElementHistorique) {
  const terminee = progression.statut === "termine";
  const dateReference = terminee ? progression.date_fin : progression.derniere_activite ?? progression.date_debut;

  return (
    <Link
      to={`/espace/formations/${formation.id}`}
      className="group flex items-center gap-4 rounded-xl border border-line bg-white p-4 transition hover:border-[#315864]"
    >
      <div className={[
        "grid h-12 w-12 shrink-0 place-items-center rounded-full",
        terminee ? "bg-[#d8f5ef] text-[#21665a]" : "bg-[#e7f0ef] text-[#315864]",
      ].join(" ")}>
        {terminee ? <CheckCircle2 size={22} /> : <BookOpen size={22} />}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
          {categorie?.nom?.toUpperCase() ?? "FORMATION"} · {terminee ? "TERMINÉE" : "EN COURS"}
        </span>
        <h2 className="mt-1 truncate text-sm font-bold text-ink">{formation.titre}</h2>
        <p className="mt-1 text-[11px] text-ink/55">
          {terminee ? "Terminée le" : "Dernière activité le"} {dateLisible(dateReference)} · {formaterDureeFormation(formation.duree_estimee_minutes)}
        </p>
      </div>
      <div className="hidden w-24 shrink-0 sm:block">
        <span className="mb-1 block text-right text-[10px] text-ink/55">{progression.pourcentage}%</span>
        <div className="h-1 overflow-hidden rounded-full bg-[#e7f0ef]">
          <span className="block h-full rounded-full bg-[#49bfa9]" style={{ width: `${progression.pourcentage}%` }} />
        </div>
      </div>
      <ArrowRight size={17} className="shrink-0 text-ink/35 transition group-hover:text-[#315864]" />
    </Link>
  );
}
