import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Check, Clock3 } from "lucide-react";
import { mesProgressions } from "../../api/affectations";
import { listerCategories, listerFormations } from "../../api/formations";
import type {
  Categorie,
  Formation,
  Progression,
  StatutProgression,
} from "../../api/types";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";
import { formaterDureeFormation } from "../../lib/duree";

type Filtre = "Toutes" | "À commencer" | "En cours" | "Terminé" | "Obligatoires";

type FormationAvecProgression = {
  formation: Formation;
  progression: Progression;
  categorie?: Categorie;
};

const libellesStatut: Record<StatutProgression, string> = {
  non_commence: "À commencer",
  en_cours: "En cours",
  termine: "Terminé",
};

const filtres: Filtre[] = [
  "Toutes",
  "À commencer",
  "En cours",
  "Terminé",
  "Obligatoires",
];

export function MesFormations() {
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

  const formationsAssociees = useMemo<FormationAvecProgression[]>(() => {
    return progressions.flatMap((progression) => {
      const formation = formations.find(
        (element) => element.id === progression.formation_id
      );

      if (!formation) return [];

      return [
        {
          formation,
          progression,
          categorie: categories.find(
            (categorie) => categorie.id === formation.categorie_id
          ),
        },
      ];
    });
  }, [categories, formations, progressions]);

  const formationsFiltrees = useMemo(() => {
    return formationsAssociees.filter(({ formation, progression }) => {
      if (filtre === "Toutes") return true;
      if (filtre === "Obligatoires") return formation.obligatoire;

      return libellesStatut[progression.statut] === filtre;
    });
  }, [filtre, formationsAssociees]);

  const chargement = chargeProgressions || chargeFormations;

  return (
    <div>
      <div className="max-w-2xl">
        <span className="section-kicker">
          <i /> MON APPRENTISSAGE
        </span>

        <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-6xl">
          Toutes les formations
        </h1>

        <p className="mt-5 text-sm leading-relaxed text-ink/60">
          Développez vos compétences avec des parcours pensés pour le terrain.
        </p>
      </div>

      <div className="mt-9 flex flex-wrap gap-2">
        {filtres.map((element) => (
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

      {chargement && (
        <LoadingState message="Chargement des formations…" />
      )}

      {error && (
        <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger vos formations. Vérifiez que le backend est démarré.
        </p>
      )}

      {!chargement && !error && (
        <div className="mt-6 flex max-w-4xl flex-col gap-2">
          {formationsFiltrees.map((element) => (
            <FormationRow key={element.progression.id} {...element} />
          ))}

          {formationsFiltrees.length === 0 && (
              <EmptyState
                icon={<BookOpen size={22} />}
                titre="Aucune formation"
                message="Aucune formation ne correspond à ce filtre."
              />
          )}
        </div>
      )}
    </div>
  );
}

function FormationRow({
  formation,
  progression,
  categorie,
}: FormationAvecProgression) {
  const terminee = progression.statut === "termine";

  return (
    <Link
      to={`/espace/formations/${formation.id}`}
      className="group flex items-center gap-4 rounded-lg border border-line bg-white p-3 transition-all hover:border-[#315864] hover:translate-x-0.5"
    >
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-[#e7f0ef] text-[#315864]">
        {terminee ? <Check size={24} /> : <BookOpen size={24} />}
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
          {categorie?.nom?.toUpperCase() ?? "FORMATION"}
          {formation.obligatoire ? " · OBLIGATOIRE" : ""}
        </span>

        <h2 className="mt-1 truncate text-sm font-bold text-ink">
          {formation.titre}
        </h2>

        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink/55">
          <Clock3 size={12} />
          {formaterDureeFormation(formation.duree_estimee_minutes)}
          <span>·</span>
          {libellesStatut[progression.statut]}
        </p>
      </div>

      <div className="hidden w-28 shrink-0 sm:block">
        <span className="mb-1 block text-right text-[10px] text-ink/55">
          {progression.pourcentage}%
        </span>

        <div className="h-1 overflow-hidden rounded-full bg-[#e7f0ef]">
          <span
            className="block h-full rounded-full bg-[#49bfa9]"
            style={{ width: `${progression.pourcentage}%` }}
          />
        </div>
      </div>

      <ArrowRight
        size={17}
        className="shrink-0 text-ink/35 transition group-hover:text-[#315864]"
      />
    </Link>
  );
}
