import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  FileText,
  FolderOpen,
  Eye,
  Link2,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  creerContenu,
  lancerIngestion,
  listerContenus,
  modifierContenu,
  supprimerContenu,
} from "../../api/contenus";
import { listerFormations } from "../../api/formations";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";
import { formaterDureeContenu } from "../../lib/duree";
import { LecteurContenu } from "../../components/LecteurContenu";
import type { Contenu, TypeContenu } from "../../api/types";

const types: { valeur: TypeContenu; libelle: string }[] = [
  { valeur: "pdf", libelle: "PDF" },
  { valeur: "presentation", libelle: "Présentation" },
  { valeur: "video", libelle: "Vidéo" },
  { valeur: "document", libelle: "Document" },
  { valeur: "lien", libelle: "Lien externe" },
];

function libelleStatut(statut: string) {
  const libelles: Record<string, string> = {
    en_attente: "Indexation programmée",
    en_cours: "Indexation IA en cours…",
    terminee: "Disponible dans l’assistant",
    echec: "Indexation à vérifier",
    non_indexable: "Non indexable",
  };

  return libelles[statut] ?? statut;
}

function couleurStatut(statut: string) {
  const couleurs: Record<string, string> = {
    en_attente: "bg-slate-100 text-slate-600",
    en_cours: "bg-amber-100 text-amber-800",
    terminee: "bg-[#d8f5ef] text-[#21665a]",
    echec: "bg-red-100 text-red-700",
    non_indexable: "bg-slate-100 text-slate-600",
  };

  return couleurs[statut] ?? "bg-slate-100 text-slate-600";
}

export function Contenus() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formationId, setFormationId] = useState(() => searchParams.get("formation") ?? "");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [contenuOuvert, setContenuOuvert] = useState<Contenu | null>(null);
  const [contenuEnEdition, setContenuEnEdition] = useState<Contenu | null>(null);

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  const { data: contenus = [], isLoading } = useQuery({
    queryKey: ["contenus", formationId],
    queryFn: () => listerContenus(formationId),
    enabled: Boolean(formationId),
    refetchInterval: formationId ? 5000 : false,
  });

  const supprimer = useMutation({
    mutationFn: (contenuId: string) => supprimerContenu(formationId, contenuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contenus", formationId] });
    },
  });

  const reindexer = useMutation({
    mutationFn: (contenuId: string) => lancerIngestion(contenuId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contenus", formationId] });
    },
  });

  return (
    <div>
      <section className="overflow-hidden rounded-xl bg-[#315864] p-7 text-white md:p-10">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
          <Sparkles size={14} />
          RESSOURCES PÉDAGOGIQUES ET RAG
        </span>

        <div className="mt-5 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
              Contenus
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Ajoutez les documents, présentations et vidéos des formations.
              Les contenus peuvent être indexés pour alimenter l’assistant IA.
            </p>
          </div>

          <button
            type="button"
            disabled={!formationId}
            onClick={() => {
              setContenuEnEdition(null);
              setFormulaireOuvert((ouvert) => !ouvert);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Ajouter un contenu
          </button>
        </div>
      </section>

      <section className="mt-7 rounded-xl border border-line bg-white p-6">
        <label className="grid max-w-xl gap-2 text-xs font-bold text-ink">
          Formation concernée

          <select
            value={formationId}
            onChange={(event) => {
              const nouvelleFormationId = event.target.value;
              setFormationId(nouvelleFormationId);
              setSearchParams(nouvelleFormationId ? { formation: nouvelleFormationId } : {});
              setFormulaireOuvert(false);
              setContenuEnEdition(null);
            }}
            className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          >
            <option value="">Choisir une formation</option>

            {formations
              .filter((formation) => formation.actif)
              .map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.titre}
                </option>
              ))}
          </select>
        </label>

        {!formationId && (
          <p className="mt-5 flex items-center gap-2 text-sm text-ink/55">
            <FolderOpen size={17} className="text-[#315864]" />
            Choisissez une formation pour consulter ou ajouter ses contenus.
          </p>
        )}
      </section>

      {formulaireOuvert && formationId && (
        <div className="mt-6">
          <FormulaireContenu
            key={contenuEnEdition?.id ?? "nouveau-contenu"}
            formationId={formationId}
            contenu={contenuEnEdition}
            onSucces={() => {
              queryClient.invalidateQueries({
                queryKey: ["contenus", formationId],
              });

              setFormulaireOuvert(false);
              setContenuEnEdition(null);
            }}
          />
        </div>
      )}

      {formationId && (
        <section className="mt-10">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
              Contenus de la formation
            </h2>

            <p className="mt-1 text-xs text-ink/55">
              Consultez les ressources comme un collaborateur, sans impacter aucune progression.
            </p>
          </div>

          {isLoading && (
            <LoadingState message="Chargement des contenus…" />
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {contenus.map((contenu) => (
              <article
                key={contenu.id}
                className="overflow-hidden rounded-xl border border-line bg-white"
              >
                <div className="flex h-24 items-center justify-between bg-[#e7f0ef] p-5 text-[#315864]">
                  {contenu.type === "video" ? (
                    <Play size={26} />
                  ) : contenu.type === "lien" ? (
                    <Link2 size={26} />
                  ) : (
                    <FileText size={26} />
                  )}

                  <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em]">
                    {contenu.type}
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="font-display text-xl font-medium text-ink">
                    {contenu.titre}
                  </h3>

                  <p className="mt-2 text-xs text-ink/55">
                    Position {contenu.ordre}
                    {contenu.duree_secondes
                      ? ` · ${formaterDureeContenu(contenu.duree_secondes)}`
                      : ""}
                  </p>

                  <div className="mt-5">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-2 text-[10px] font-bold",
                        couleurStatut(contenu.statut_ingestion),
                      ].join(" ")}
                    >
                      {libelleStatut(contenu.statut_ingestion)}
                    </span>

                    {contenu.statut_ingestion === "echec" &&
                      contenu.erreur_ingestion && (
                        <div className="mt-3">
                          <p className="text-xs leading-relaxed text-red-700">
                            {contenu.erreur_ingestion}
                          </p>
                          <button
                            type="button"
                            onClick={() => reindexer.mutate(contenu.id)}
                            disabled={reindexer.isPending}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Play size={13} />
                            {reindexer.isPending ? "Relance…" : "Relancer l’indexation"}
                          </button>
                        </div>
                      )}

                    {contenu.statut_ingestion === "terminee" && (
                      <p className="mt-3 text-xs text-[#21665a]">
                        Ce contenu peut maintenant être utilisé dans les
                        réponses et les générations de l’assistant IA.
                      </p>
                    )}

                    {estConsultable(contenu) && (
                      <button
                        type="button"
                        onClick={() => setContenuOuvert(contenu)}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#315864] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#1f3e47]"
                      >
                        <Eye size={14} />
                        Consulter
                      </button>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setContenuEnEdition(contenu);
                          setFormulaireOuvert(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-[11px] font-bold text-[#315864] hover:border-[#315864]"
                      >
                        <Pencil size={13} /> Modifier
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Supprimer définitivement le contenu « ${contenu.titre} » ?`)) {
                            supprimer.mutate(contenu.id);
                          }
                        }}
                        disabled={supprimer.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {!isLoading && contenus.length === 0 && (
              <EmptyState
                icon={<FileText size={22} />}
                titre="Aucun contenu"
                message="Ajoutez votre premier contenu à cette formation."
              />
            )}
          </div>
        </section>
      )}

      <LecteurContenu
        contenu={contenuOuvert}
        ouvert={contenuOuvert !== null}
        formationId={formationId}
        activerSuivi={false}
        surFermeture={() => setContenuOuvert(null)}
        surComplet={() => undefined}
      />
    </div>
  );
}

function estConsultable(contenu: Contenu): boolean {
  return (
    contenu.type === "video" ||
    contenu.type === "pdf" ||
    contenu.type === "presentation" ||
    contenu.chemin_fichier.toLowerCase().endsWith(".pdf")
  );
}

function FormulaireContenu({
  formationId,
  contenu,
  onSucces,
}: {
  formationId: string;
  contenu: Contenu | null;
  onSucces: () => void;
}) {
  const estEnEdition = contenu !== null;
  const [type, setType] = useState<TypeContenu>(contenu?.type ?? "pdf");
  const [titre, setTitre] = useState(contenu?.titre ?? "");
  const [fichier, setFichier] = useState<File | undefined>();
  const [url, setUrl] = useState(contenu?.type === "lien" ? contenu.chemin_fichier : "");
  const [ordre, setOrdre] = useState(contenu?.ordre.toString() ?? "");
  const [dureeMinutes, setDureeMinutes] = useState(
    contenu?.duree_secondes ? String(Math.floor(contenu.duree_secondes / 60)) : ""
  );
  const [dureeSecondes, setDureeSecondes] = useState(
    contenu?.duree_secondes ? String(contenu.duree_secondes % 60) : ""
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = useMutation({
    mutationFn: () => {
      const dureeTotale = Number(dureeMinutes || 0) * 60 + Number(dureeSecondes || 0);
      if (type !== "lien" && dureeTotale <= 0) {
        throw new Error("Indiquez une durée estimée supérieure à zéro pour ce contenu.");
      }

      if (estEnEdition && contenu) {
        return modifierContenu(formationId, contenu.id, {
          titre,
          ordre: Number(ordre),
          duree_secondes: dureeTotale > 0 ? dureeTotale : undefined,
        });
      }

      return creerContenu(formationId, {
        type,
        titre,
        fichier,
        url,
        ordre: ordre ? Number(ordre) : undefined,
        duree_secondes: dureeTotale > 0 ? dureeTotale : undefined,
      });
    },

    onSuccess: onSucces,

    onError: (error) => {
      setErreur(
        error instanceof Error
          ? error.message
          : estEnEdition
            ? "Impossible de modifier le contenu."
            : "Impossible d’ajouter le contenu."
      );
    },
  });

  return (
    <section className="rounded-xl border border-line bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
          <Upload size={20} />
        </div>

        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            {estEnEdition ? "Modifier le contenu" : "Ajouter un contenu"}
          </h2>

          <p className="text-xs text-ink/55">
            {estEnEdition
              ? "Modifiez le titre, l’ordre et la durée sans remplacer le fichier existant."
              : "Les formats autorisés dépendent du type choisi."}
          </p>
        </div>
      </div>

      <form
        className="mt-7 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setErreur(null);
          enregistrer.mutate();
        }}
      >
        {erreur && (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {erreur}
          </p>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Type de contenu

            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as TypeContenu);
                setFichier(undefined);
                setUrl("");
              }}
              disabled={estEnEdition}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9] disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {types.map((element) => (
                <option key={element.valeur} value={element.valeur}>
                  {element.libelle}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Titre

            <input
              required
              value={titre}
              onChange={(event) => setTitre(event.target.value)}
              placeholder="Exemple : Guide des bons réflexes"
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Position dans le parcours
            <input
              required
              type="number"
              min="1"
              value={ordre}
              onChange={(event) => setOrdre(event.target.value)}
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>
        </div>

        {estEnEdition ? (
          <p className="rounded-md bg-[#f1f6f5] px-4 py-3 text-xs text-ink/60">
            Pour remplacer le fichier ou l’URL, supprimez ce contenu puis ajoutez-en un nouveau.
          </p>
        ) : type === "lien" ? (
          <label className="grid gap-2 text-xs font-bold text-ink">
            URL du lien externe

            <input
              required
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>
        ) : (
          <label className="grid gap-2 text-xs font-bold text-ink">
            Fichier

            <input
              required
              type="file"
              onChange={(event) => setFichier(event.target.files?.[0])}
              className="rounded-md border border-dashed border-[#49bfa9] bg-[#f7faf9] px-4 py-4 text-sm font-normal"
            />
          </label>
        )}

        <div className="grid max-w-md gap-2 text-xs font-bold text-ink">
          <span>Durée estimée {type !== "lien" ? "(obligatoire)" : "(facultative)"}</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 font-normal text-ink/60">
              Minutes
              <input
                type="number"
                min="0"
                step="1"
                value={dureeMinutes}
                onChange={(event) => setDureeMinutes(event.target.value)}
                placeholder="Exemple : 12"
                className="rounded-md border border-line px-4 py-3 text-sm text-ink outline-none focus:border-[#49bfa9]"
              />
            </label>
            <label className="grid gap-1 font-normal text-ink/60">
              Secondes
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                value={dureeSecondes}
                onChange={(event) => setDureeSecondes(event.target.value)}
                placeholder="Exemple : 30"
                className="rounded-md border border-line px-4 py-3 text-sm text-ink outline-none focus:border-[#49bfa9]"
              />
            </label>
          </div>
          {type !== "lien" && (
            <p className="font-normal leading-relaxed text-ink/55">
              La validation du collaborateur est déclenchée automatiquement après 90 % de cette durée.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={enregistrer.isPending}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-[#315864] px-5 py-3 text-xs font-bold text-white hover:bg-[#1f3e47]"
        >
          <Check size={15} />
          {enregistrer.isPending
            ? estEnEdition ? "Enregistrement…" : "Ajout…"
            : estEnEdition ? "Enregistrer les modifications" : "Ajouter le contenu"}
        </button>
      </form>
    </section>
  );
}
