import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { listerFormations } from "../../api/formations";
import {
  consulterRapportSuivi,
  telechargerRapportSuiviCsv,
  telechargerRapportSuiviExcel,
  telechargerRapportSuiviPdf,
  type StatutRapport,
} from "../../api/rapports";
import { listerDepartements } from "../../api/utilisateurs";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";

const libellesStatut: Record<StatutRapport, string> = {
  non_commence: "En attente",
  en_cours: "En cours",
  termine: "Terminée",
};

const couleursStatut: Record<StatutRapport, string> = {
  non_commence: "bg-amber-50 text-amber-700",
  en_cours: "bg-sky-50 text-sky-700",
  termine: "bg-emerald-50 text-emerald-700",
};

export function Resultats() {
  const [formationId, setFormationId] = useState("");
  const [departementId, setDepartementId] = useState("");
  const [recherche, setRecherche] = useState("");
  const [exportEnCours, setExportEnCours] = useState(false);
  const [erreurExport, setErreurExport] = useState<string | null>(null);
  const [exportExcelEnCours, setExportExcelEnCours] = useState(false);
  const [exportPdfEnCours, setExportPdfEnCours] = useState(false);

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });
  const { data: departements = [] } = useQuery({
    queryKey: ["departements"],
    queryFn: listerDepartements,
  });
  const { data: rapport, isLoading, error } = useQuery({
    queryKey: ["rapport-suivi", formationId, departementId],
    queryFn: () =>
      consulterRapportSuivi({
        formation_id: formationId || undefined,
        departement_id: departementId || undefined,
      }),
  });

  const resultatsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!rapport || !terme) return rapport?.resultats ?? [];

    return rapport.resultats.filter((resultat) =>
      [
        resultat.utilisateur_prenom,
        resultat.utilisateur_nom,
        resultat.departement_nom ?? "",
        resultat.formation_titre,
      ].some((valeur) => valeur.toLowerCase().includes(terme))
    );
  }, [rapport, recherche]);

  if (isLoading) return <LoadingState message="Calcul des indicateurs de suivi…" />;

  if (error || !rapport) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Impossible de charger les résultats de suivi.
      </p>
    );
  }

  async function exporterCsv() {
    setExportEnCours(true);
    setErreurExport(null);
    try {
      await telechargerRapportSuiviCsv({
        formation_id: formationId || undefined,
        departement_id: departementId || undefined,
      });
    } catch (cause) {
      setErreurExport(
        cause instanceof Error ? cause.message : "Impossible de générer le fichier CSV."
      );
    } finally {
      setExportEnCours(false);
    }
  }

  async function exporterExcel() {
    setExportExcelEnCours(true);
    setErreurExport(null);
    try {
      await telechargerRapportSuiviExcel({
        formation_id: formationId || undefined,
        departement_id: departementId || undefined,
      });
    } catch (cause) {
      setErreurExport(
        cause instanceof Error ? cause.message : "Impossible de générer le fichier Excel."
      );
    } finally {
      setExportExcelEnCours(false);
    }
  }

  async function exporterPdf() {
    setExportPdfEnCours(true);
    setErreurExport(null);
    try {
      await telechargerRapportSuiviPdf({
        formation_id: formationId || undefined,
        departement_id: departementId || undefined,
      });
    } catch (cause) {
      setErreurExport(
        cause instanceof Error ? cause.message : "Impossible de générer le fichier PDF."
      );
    } finally {
      setExportPdfEnCours(false);
    }
  }

  return (
    <div>
      <section className="overflow-hidden rounded-xl bg-[#315864] p-7 text-white md:p-10">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
          <BarChart3 size={14} />
          PILOTAGE EXIA ACADEMY
        </span>
        <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
          Résultats et suivi
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">
          Consultez la progression individuelle et les indicateurs collectifs avant de générer vos rapports.
        </p>
      </section>

      <section className="mt-7 rounded-xl border border-line bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Formation
            <select
              value={formationId}
              onChange={(event) => setFormationId(event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            >
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>{formation.titre}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold text-ink">
            Service
            <select
              value={departementId}
              onChange={(event) => setDepartementId(event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            >
              <option value="">Tous les services</option>
              {departements.map((departement) => (
                <option key={departement.id} value={departement.id}>{departement.nom}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicateur label="PROGRESSION MOYENNE" valeur={`${rapport.taux_completion}%`} detail={`${rapport.progressions_terminees} formation(s) terminée(s)`} icon={<BarChart3 size={18} />} />
        <Indicateur label="TAUX DE RÉUSSITE" valeur={rapport.taux_reussite === null ? "—" : `${rapport.taux_reussite}%`} detail="dernières tentatives de quiz" icon={<CheckCircle2 size={18} />} />
        <Indicateur label="CONFORMITÉ" valeur={rapport.taux_conformite === null ? "—" : `${rapport.taux_conformite}%`} detail="formations obligatoires terminées" icon={<ShieldCheck size={18} />} />
        <Indicateur label="EN ATTENTE" valeur={rapport.formations_en_attente} detail={`${rapport.collaborateurs_concernes} collaborateur(s) concerné(s)`} icon={<Clock3 size={18} />} />
      </section>

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">Détail individuel</h2>
            <p className="mt-1 text-xs text-ink/55">{resultatsFiltres.length} progression(s) affichée(s).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3">
              <Search size={15} className="text-ink/45" />
              <input value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un collaborateur…" className="h-10 w-56 border-0 bg-transparent text-xs outline-none" />
            </div>
            <button type="button" onClick={() => void exporterCsv()} disabled={exportEnCours} className="inline-flex items-center gap-2 rounded-md bg-[#315864] px-4 py-3 text-xs font-bold text-white hover:bg-[#1f3e47] disabled:cursor-wait disabled:opacity-60">
              {exportEnCours ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exportEnCours ? "Export…" : "Exporter CSV"}
            </button>
            <button type="button" onClick={() => void exporterExcel()} disabled={exportExcelEnCours} className="inline-flex items-center gap-2 rounded-md border border-[#315864] bg-white px-4 py-3 text-xs font-bold text-[#315864] hover:bg-[#e7f0ef] disabled:cursor-wait disabled:opacity-60">
              {exportExcelEnCours ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exportExcelEnCours ? "Export…" : "Exporter Excel"}
            </button>
            <button type="button" onClick={() => void exporterPdf()} disabled={exportPdfEnCours} className="inline-flex items-center gap-2 rounded-md border border-[#49bfa9] bg-[#e7f0ef] px-4 py-3 text-xs font-bold text-[#315864] hover:bg-[#d8f5ef] disabled:cursor-wait disabled:opacity-60">
              {exportPdfEnCours ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {exportPdfEnCours ? "Export…" : "Exporter PDF"}
            </button>
          </div>
        </div>

        {erreurExport && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erreurExport}</p>}

        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="min-w-[850px] w-full text-left">
            <thead className="border-b border-line bg-[#f7faf9] text-[9px] font-bold tracking-[0.13em] text-ink/45">
              <tr><th className="px-5 py-4">COLLABORATEUR</th><th className="px-5 py-4">SERVICE</th><th className="px-5 py-4">FORMATION</th><th className="px-5 py-4">PROGRESSION</th><th className="px-5 py-4">STATUT</th><th className="px-5 py-4">DERNIÈRE ACTIVITÉ</th><th className="px-5 py-4">ÉCHÉANCE</th></tr>
            </thead>
            <tbody>
              {resultatsFiltres.map((resultat) => (
                <tr key={`${resultat.utilisateur_id}-${resultat.formation_id}`} className="border-b border-line last:border-0">
                  <td className="px-5 py-4 text-sm font-semibold text-ink">{resultat.utilisateur_prenom} {resultat.utilisateur_nom}</td>
                  <td className="px-5 py-4 text-xs text-ink/60">{resultat.departement_nom ?? "Non renseigné"}</td>
                  <td className="px-5 py-4 text-xs text-ink/70"><span>{resultat.formation_titre}</span>{resultat.formation_obligatoire && <span className="ml-2 rounded-full bg-[#e7f0ef] px-2 py-1 text-[8px] font-bold text-[#315864]">OBLIGATOIRE</span>}</td>
                  <td className="px-5 py-4"><div className="flex min-w-28 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-[#49bfa9]" style={{ width: `${resultat.pourcentage}%` }} /></div><span className="text-[10px] font-bold text-ink/60">{resultat.pourcentage}%</span></div></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${couleursStatut[resultat.statut]}`}>{libellesStatut[resultat.statut]}</span></td>
                  <td className="px-5 py-4 text-xs text-ink/60">{resultat.derniere_activite ? new Date(resultat.derniere_activite).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Aucune activité"}</td>
                  <td className="px-5 py-4 text-xs text-ink/60">{resultat.date_limite ? new Date(resultat.date_limite).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {resultatsFiltres.length === 0 && <EmptyState icon={<Users size={22} />} titre="Aucun résultat" message="Aucune progression ne correspond aux filtres sélectionnés." />}
        </div>
      </section>
    </div>
  );
}

function Indicateur({
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
