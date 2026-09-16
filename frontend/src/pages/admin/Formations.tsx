import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Clock3,
  Trash2,
  X,
} from "lucide-react";
import {
  creerCategorie,
  creerFormation,
  desactiverFormation,
  listerCategories,
  listerFormations,
  modifierFormation,
  reactiverFormation,
  supprimerFormationDefinitivement,
} from "../../api/formations";
import type { Formation } from "../../api/types";
import { formaterDureeFormation } from "../../lib/duree";

type Filtre = "toutes" | "actives" | "desactivees";

export function Formations() {
  const queryClient = useQueryClient();

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [formationEnEdition, setFormationEnEdition] = useState<Formation | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [recherche, setRecherche] = useState("");

  const { data: formations = [], isLoading, error } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: listerCategories,
  });

  const changerEtat = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      if (actif) {
        await desactiverFormation(id);
      } else {
        await reactiverFormation(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
    },
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => supprimerFormationDefinitivement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
    },
  });

  const formationsFiltrees = useMemo(() => {
    return formations.filter((formation) => {
      const correspondRecherche = formation.titre
        .toLowerCase()
        .includes(recherche.toLowerCase());

      const correspondFiltre =
        filtre === "toutes" ||
        (filtre === "actives" && formation.actif) ||
        (filtre === "desactivees" && !formation.actif);

      return correspondRecherche && correspondFiltre;
    });
  }, [filtre, formations, recherche]);

  const formationsActives = formations.filter((formation) => formation.actif).length;

  return (
    <div>
      <section className="overflow-hidden rounded-xl bg-[#315864] p-7 text-white md:p-10">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
          <Sparkles size={14} />
          CATALOGUE EXIA ACADEMY
        </span>

        <div className="mt-5 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
              Formations
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Créez et organisez les parcours de formation proposés aux
              collaborateurs d’EXIA Technologies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormationEnEdition(null);
              setFormulaireOuvert((ouvert) => !ouvert);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a] hover:bg-[#63d2bf]"
          >
            {formulaireOuvert ? <X size={16} /> : <Plus size={16} />}
            {formulaireOuvert ? "Fermer" : "Créer une formation"}
          </button>
        </div>
      </section>

      {formulaireOuvert && (
        <div className="mt-6">
          <FormulaireFormation
            key={formationEnEdition?.id ?? "nouvelle-formation"}
            categories={categories}
            formation={formationEnEdition}
            onSucces={() => {
              setFormationEnEdition(null);
              setFormulaireOuvert(false);
            }}
          />
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
              Votre catalogue
            </h2>

            <p className="mt-1 text-xs text-ink/55">
              {formations.length} formation(s) · {formationsActives} active(s) · {categories.length} catégorie(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3">
              <Search size={15} className="text-ink/45" />

              <input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher…"
                className="h-10 w-40 border-0 bg-transparent text-xs outline-none"
              />
            </div>

            <select
              value={filtre}
              onChange={(event) => setFiltre(event.target.value as Filtre)}
              className="h-10 rounded-md border border-line bg-white px-3 text-xs font-semibold text-ink/70 outline-none"
            >
              <option value="toutes">Toutes</option>
              <option value="actives">Actives</option>
              <option value="desactivees">Désactivées</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <p className="mt-7 text-sm text-ink/60">Chargement du catalogue…</p>
        )}

        {error && (
          <p className="mt-7 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Impossible de charger les formations.
          </p>
        )}

        {!isLoading && !error && (
          <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
            {formationsFiltrees.map((formation) => {
              const categorie = categories.find(
                (element) => element.id === formation.categorie_id
              );

              return (
                <article
                  key={formation.id}
                  className="group grid gap-4 border-b border-line px-5 py-5 last:border-0 lg:grid-cols-[52px_minmax(250px,1fr)_auto] lg:items-center lg:px-6"
                >
                  <div
                    className="grid h-[52px] w-[52px] place-items-center rounded-xl text-[#315864]"
                    style={{ backgroundColor: categorie?.couleur ?? "#e7f0ef" }}
                  >
                    <BookOpen size={23} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
                        {categorie?.nom?.toUpperCase() ?? "FORMATION"}
                      </span>
                      {formation.obligatoire && (
                        <span className="rounded-full bg-[#fff3e8] px-2 py-1 text-[8px] font-bold tracking-wide text-[#a45012]">
                          OBLIGATOIRE
                        </span>
                      )}
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-[8px] font-bold tracking-wide",
                          formation.actif
                            ? "bg-[#d8f5ef] text-[#21665a]"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {formation.actif ? "ACTIVE" : "DÉSACTIVÉE"}
                      </span>
                    </div>

                    <h3 className="mt-2 font-display text-2xl font-medium tracking-[-0.04em] text-ink">
                      {formation.titre}
                    </h3>

                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink/60 line-clamp-2">
                      {formation.description ?? "Aucune description renseignée."}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink/55">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={13} className="text-[#315864]" />
                        {formaterDureeFormation(formation.duree_estimee_minutes)}
                      </span>
                      <span>Créée le {new Date(formation.date_creation).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Link
                      to={`/admin/contenus?formation=${formation.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#315864] px-3 py-2.5 text-[11px] font-bold text-white hover:bg-[#1f3e47]"
                    >
                      <FolderOpen size={14} />
                      Contenus
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setFormationEnEdition(formation);
                        setFormulaireOuvert(true);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2.5 text-[11px] font-bold text-[#315864] hover:border-[#315864]"
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changerEtat.mutate({
                          id: formation.id,
                          actif: formation.actif,
                        })
                      }
                      disabled={changerEtat.isPending}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-[11px] font-bold text-ink/55 hover:bg-slate-100 hover:text-[#315864] disabled:opacity-50"
                    >
                      {formation.actif ? (
                        <><EyeOff size={14} /> Désactiver</>
                      ) : (
                        <><Eye size={14} /> Réactiver</>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Supprimer définitivement la formation « ${formation.titre} », ses contenus, questionnaires et résultats associés ?`)) {
                          supprimer.mutate(formation.id);
                        }
                      }}
                      disabled={supprimer.isPending}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2.5 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </article>
              );
            })}

            {formationsFiltrees.length === 0 && (
              <div className="p-7 text-sm text-ink/55">
                Aucune formation ne correspond à votre recherche.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FormulaireFormation({
  categories,
  formation,
  onSucces,
}: {
  categories: { id: string; nom: string }[];
  formation: Formation | null;
  onSucces: () => void;
}) {
  const queryClient = useQueryClient();
  const estEnEdition = formation !== null;

  const [titre, setTitre] = useState(formation?.titre ?? "");
  const [description, setDescription] = useState(formation?.description ?? "");
  const [categorieId, setCategorieId] = useState(formation?.categorie_id ?? "");
  const [nouvelleCategorie, setNouvelleCategorie] = useState("");
  const [obligatoire, setObligatoire] = useState(formation?.obligatoire ?? false);
  const [duree, setDuree] = useState(
    formation?.duree_estimee_minutes?.toString() ?? ""
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let categorieFinale = categorieId;

      if (!categorieFinale && nouvelleCategorie.trim()) {
        const categorie = await creerCategorie({
          nom: nouvelleCategorie.trim(),
          couleur: "#49BFA9",
        });

        categorieFinale = categorie.id;
      }

      if (!categorieFinale) {
        throw new Error("Sélectionnez ou créez une catégorie.");
      }

      const donnees = {
        titre,
        description: description.trim() || null,
        categorie_id: categorieFinale,
        obligatoire,
        duree_estimee_minutes: duree ? Number(duree) : null,
      };

      if (formation) {
        return modifierFormation(formation.id, donnees);
      }

      return creerFormation({
        ...donnees,
        description: description.trim() || undefined,
        duree_estimee_minutes: duree ? Number(duree) : undefined,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onSucces();
    },

    onError: (error) => {
      setErreur(
        error instanceof Error
          ? error.message
          : estEnEdition
            ? "Impossible de modifier la formation."
            : "Impossible de créer la formation."
      );
    },
  });

  return (
    <section className="rounded-xl border border-line bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
          <Plus size={20} />
        </div>

        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            {estEnEdition ? "Modifier la formation" : "Nouvelle formation"}
          </h2>
          <p className="text-xs text-ink/55">
            {estEnEdition
              ? "Les modifications seront enregistrées sans affecter l’historique des collaborateurs."
              : "Les informations seront enregistrées dans le backend."}
          </p>
        </div>
      </div>

      <form
        className="mt-7 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setErreur(null);
          mutation.mutate();
        }}
      >
        {erreur && (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{erreur}</p>
        )}

        <label className="grid gap-2 text-xs font-bold text-ink">
          Titre de la formation
          <input
            required
            value={titre}
            onChange={(event) => setTitre(event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <label className="grid gap-2 text-xs font-bold text-ink">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Catégorie existante
            <span className="relative">
              <select
                value={categorieId}
                onChange={(event) => setCategorieId(event.target.value)}
                className="w-full appearance-none rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
              >
                <option value="">Choisir une catégorie</option>

                {categories.map((categorie) => (
                  <option key={categorie.id} value={categorie.id}>
                    {categorie.nom}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-3 text-ink/45"
              />
            </span>
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Ou créer une catégorie
            <input
              value={nouvelleCategorie}
              onChange={(event) => setNouvelleCategorie(event.target.value)}
              disabled={Boolean(categorieId)}
              placeholder="Exemple : Cybersécurité"
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9] disabled:bg-slate-50 disabled:text-ink/35"
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Durée estimée en minutes
            <input
              type="number"
              min="1"
              value={duree}
              onChange={(event) => setDuree(event.target.value)}
              placeholder="Exemple : 45"
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>

          <label className="flex items-center gap-3 self-end rounded-md bg-[#e7f0ef] px-4 py-3 text-sm text-[#315864]">
            <input
              type="checkbox"
              checked={obligatoire}
              onChange={(event) => setObligatoire(event.target.checked)}
              className="h-4 w-4 accent-[#315864]"
            />

            Formation obligatoire
          </label>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-[#315864] px-5 py-3 text-xs font-bold text-white hover:bg-[#1f3e47] disabled:opacity-60"
        >
          <Check size={15} />
          {mutation.isPending
            ? estEnEdition
              ? "Enregistrement…"
              : "Création…"
            : estEnEdition
              ? "Enregistrer les modifications"
              : "Créer la formation"}
        </button>
      </form>
    </section>
  );
}
