import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";
import { mesResultats } from "../../api/tentatives";
import type { ResultatPersonnel } from "../../api/types";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";
import { API_BASE_URL } from "../../api/client";

function dateLisible(date: string | null) {
  if (!date) return "Tentative en cours";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

export function MesResultats() {
  const { data: resultats = [], isLoading, error } = useQuery({
    queryKey: ["mes-resultats"],
    queryFn: mesResultats,
  });

  const termines = resultats.filter((resultat) => resultat.statut === "terminee");
  const reussis = termines.filter((resultat) => resultat.reussi).length;
  const moyenne = termines.length
    ? Math.round(termines.reduce((total, resultat) => total + (resultat.score ?? 0), 0) / termines.length)
    : 0;

  return (
    <div className="max-w-4xl">
      <span className="section-kicker"><i /> MES ÉVALUATIONS</span>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-6xl">Mes résultats</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/60">
        Consultez l’historique de vos évaluations et retrouvez vos certificats de réussite.
      </p>

      <div className="mt-9 grid gap-3 sm:grid-cols-3">
        <Resume label="TENTATIVES TERMINÉES" valeur={termines.length} />
        <Resume label="ÉVALUATIONS RÉUSSIES" valeur={reussis} />
        <Resume label="SCORE MOYEN" valeur={`${moyenne}%`} />
      </div>

      {isLoading && <LoadingState message="Chargement de vos résultats…" />}
      {error && <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Impossible de charger vos résultats. Vérifiez que le backend est démarré.</p>}

      {!isLoading && !error && (
        <div className="mt-8 space-y-3">
          {resultats.map((resultat) => <ResultatLigne key={resultat.id} resultat={resultat} />)}
          {resultats.length === 0 && (
            <EmptyState
              icon={<ClipboardCheck size={22} />}
              titre="Aucun résultat pour le moment"
              message="Vos résultats apparaîtront ici après votre premier quiz."
            />
          )}
        </div>
      )}
    </div>
  );
}

function Resume({ label, valeur }: { label: string; valeur: string | number }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5">
      <span className="text-[9px] font-bold tracking-[0.12em] text-[#315864]">{label}</span>
      <strong className="mt-3 block text-3xl font-semibold tracking-[-0.06em] text-[#315864]">{valeur}</strong>
    </div>
  );
}

function ResultatLigne({ resultat }: { resultat: ResultatPersonnel }) {
  const enCours = resultat.statut === "en_cours";
  const reussi = resultat.reussi === true;
  const Icone = enCours ? ClipboardCheck : reussi ? CheckCircle2 : XCircle;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 sm:flex-row sm:items-center">
      <div className={[
        "grid h-12 w-12 shrink-0 place-items-center rounded-full",
        enCours ? "bg-[#e7f0ef] text-[#315864]" : reussi ? "bg-[#d8f5ef] text-[#21665a]" : "bg-red-50 text-red-600",
      ].join(" ")}>
        <Icone size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">{enCours ? "EN COURS" : reussi ? "VALIDÉ" : "NON VALIDÉ"}</span>
        <h2 className="mt-1 truncate text-sm font-bold text-ink">{resultat.formation_titre}</h2>
        <p className="mt-1 text-[11px] text-ink/55">{resultat.questionnaire_titre} · tentative n°{resultat.numero_tentative} · {dateLisible(resultat.date_passage)}</p>
      </div>
      <div className="flex items-center gap-4 sm:ml-auto">
        <div className="text-right">
          <span className="block text-lg font-bold text-[#315864]">{resultat.score === null ? "—" : `${resultat.score}%`}</span>
          <span className="text-[10px] text-ink/50">minimum {resultat.score_minimum_reussite}%</span>
        </div>
        {resultat.certificat_id ? (
          <a href={`${API_BASE_URL}/api/certificats/${resultat.certificat_id}/public/pdf/apercu`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#315864] px-3 py-2 text-xs font-bold text-white hover:bg-[#1f3e47]">
            <Award size={14} /> Certificat
          </a>
        ) : (
          <Link to={`/espace/formations/${resultat.formation_id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#315864]">
            Formation <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
