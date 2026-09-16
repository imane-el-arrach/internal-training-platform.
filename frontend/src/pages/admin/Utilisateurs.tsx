import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Building2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  creerUtilisateur,
  creerDepartement,
  desactiverUtilisateur,
  listerDepartements,
  listerUtilisateurs,
  modifierUtilisateur,
  reactiverUtilisateur,
  supprimerDepartement,
  supprimerUtilisateurDefinitivement,
} from "../../api/utilisateurs";
import type { Role, Utilisateur } from "../../api/types";
import { EmptyState, LoadingState } from "../../components/ui/Primitives";

export function Utilisateurs() {
  const queryClient = useQueryClient();
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [utilisateurEnEdition, setUtilisateurEnEdition] =
    useState<Utilisateur | null>(null);
  const [nouveauDepartement, setNouveauDepartement] = useState("");
  const [erreurDepartement, setErreurDepartement] = useState<string | null>(null);
  const [departementSelectionneId, setDepartementSelectionneId] = useState<string | null>(null);

  const { data: utilisateurs = [], isLoading, error } = useQuery({
    queryKey: ["utilisateurs"],
    queryFn: () => listerUtilisateurs(),
  });

  const changerEtat = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      if (actif) {
        await desactiverUtilisateur(id);
      } else {
        await reactiverUtilisateur(id);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
    },
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => supprimerUtilisateurDefinitivement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      queryClient.invalidateQueries({ queryKey: ["departements"] });
    },
  });

  const { data: departements = [] } = useQuery({
    queryKey: ["departements"],
    queryFn: listerDepartements,
  });

  const creerService = useMutation({
    mutationFn: () => creerDepartement(nouveauDepartement.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departements"] });
      setNouveauDepartement("");
      setErreurDepartement(null);
    },
    onError: (error) => {
      setErreurDepartement(
        error instanceof Error ? error.message : "Impossible de créer ce service."
      );
    },
  });

  const supprimerService = useMutation({
    mutationFn: (id: string) => supprimerDepartement(id),
    onSuccess: (_resultat, id) => {
      queryClient.invalidateQueries({ queryKey: ["departements"] });
      setErreurDepartement(null);
      setDepartementSelectionneId((selection) => selection === id ? null : selection);
    },
    onError: (error) => {
      setErreurDepartement(
        error instanceof Error ? error.message : "Impossible de supprimer ce service."
      );
    },
  });

  const departementSelectionne = departements.find(
    (departement) => departement.id === departementSelectionneId
  );
  const membresDepartementSelectionne = utilisateurs.filter(
    (utilisateur) => utilisateur.departement_id === departementSelectionneId
  );

  return (
    <div>
      <section className="overflow-hidden rounded-xl bg-[#315864] p-7 text-white md:p-10">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
          <Users size={14} />
          POPULATION EXIA ACADEMY
        </span>

        <div className="mt-5 flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
              Utilisateurs
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Gérez les collaborateurs, les administrateurs et leurs accès à
              la plateforme de formation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setUtilisateurEnEdition(null);
              setFormulaireOuvert((ouvert) => !ouvert);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a]"
          >
            {formulaireOuvert ? <X size={16} /> : <UserPlus size={16} />}
            {formulaireOuvert ? "Fermer" : "Nouvel utilisateur"}
          </button>
        </div>
      </section>

      {formulaireOuvert && (
        <div className="mt-6">
          <FormulaireUtilisateur
            key={utilisateurEnEdition?.id ?? "nouvel-utilisateur"}
            utilisateur={utilisateurEnEdition}
            onSucces={() => {
              setUtilisateurEnEdition(null);
              setFormulaireOuvert(false);
            }}
          />
        </div>
      )}

      <section className="mt-10 rounded-xl border border-line bg-white p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-medium text-ink">Services</h2>
                <p className="mt-1 text-xs text-ink/55">Organisez les collaborateurs avant de leur affecter des parcours.</p>
              </div>
            </div>
          </div>

          <form
            className="flex w-full gap-2 md:max-w-md"
            onSubmit={(event) => {
              event.preventDefault();
              setErreurDepartement(null);
              if (nouveauDepartement.trim()) creerService.mutate();
            }}
          >
            <input
              required
              value={nouveauDepartement}
              onChange={(event) => setNouveauDepartement(event.target.value)}
              placeholder="Exemple : Ressources humaines"
              className="min-w-0 flex-1 rounded-md border border-line px-4 py-3 text-sm outline-none focus:border-[#49bfa9]"
            />
            <button type="submit" disabled={creerService.isPending} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#315864] px-4 py-3 text-xs font-bold text-white disabled:opacity-60">
              <Plus size={15} />
              Ajouter
            </button>
          </form>
        </div>

        {erreurDepartement && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erreurDepartement}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {departements.map((departement) => {
            const membres = utilisateurs.filter(
              (utilisateur) => utilisateur.departement_id === departement.id
            ).length;
            return (
              <div key={departement.id} className={["inline-flex items-center gap-2 rounded-lg border px-3 py-2", departementSelectionneId === departement.id ? "border-[#315864] bg-[#e7f0ef]" : "border-line bg-[#f7faf9]"].join(" ")}>
                <button
                  type="button"
                  onClick={() => setDepartementSelectionneId((id) => id === departement.id ? null : departement.id)}
                  className="inline-flex items-center gap-2 text-left"
                  aria-expanded={departementSelectionneId === departement.id}
                >
                  <span className="text-xs font-bold text-[#315864]">{departement.nom}</span>
                  <span className="text-[10px] text-ink/55">{membres} membre(s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Supprimer le service « ${departement.nom} » ? Il doit être vide et sans affectation.`)) {
                      setErreurDepartement(null);
                      supprimerService.mutate(departement.id);
                    }
                  }}
                  disabled={supprimerService.isPending}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  aria-label={`Supprimer le service ${departement.nom}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          {departements.length === 0 && <span className="text-xs text-ink/55">Aucun service n’est encore créé.</span>}
        </div>

        {departementSelectionne && (
          <div className="mt-6 overflow-hidden rounded-lg border border-[#b9ddd5] bg-[#f7faf9]">
            <div className="flex items-center justify-between gap-4 border-b border-[#cfe7e1] bg-[#e7f0ef] px-5 py-4">
              <div>
                <span className="text-[9px] font-bold tracking-[0.13em] text-[#315864]">SERVICE</span>
                <h3 className="mt-1 text-base font-bold text-ink">{departementSelectionne.nom}</h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#315864]">{membresDepartementSelectionne.length} membre(s)</span>
            </div>

            <div className="divide-y divide-[#d9e9e5]">
              {membresDepartementSelectionne.map((utilisateur) => (
                <div key={utilisateur.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-[#315864] text-[10px] font-bold text-white">
                      {utilisateur.prenom.charAt(0)}{utilisateur.nom.charAt(0)}
                    </div>
                    <div>
                      <strong className="block text-sm text-ink">{utilisateur.prenom} {utilisateur.nom}</strong>
                      <span className="text-[11px] text-ink/55">{utilisateur.poste ?? utilisateur.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#315864]">{utilisateur.role === "administrateur" ? "Administrateur" : "Collaborateur"}</span>
                    <span className={["rounded-full px-3 py-1.5 text-[10px] font-bold", utilisateur.actif ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"].join(" ")}>{utilisateur.actif ? "Actif" : "Désactivé"}</span>
                  </div>
                </div>
              ))}
              {membresDepartementSelectionne.length === 0 && <p className="px-5 py-5 text-sm text-ink/55">Aucun collaborateur n’est encore rattaché à ce service.</p>}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
              Comptes utilisateurs
            </h2>

            <p className="mt-1 text-xs text-ink/55">
              {utilisateurs.length} compte(s) enregistré(s).
            </p>
          </div>
        </div>

        {isLoading && (
          <LoadingState message="Chargement des utilisateurs…" />
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Impossible de charger les utilisateurs.
          </p>
        )}

        {!isLoading && !error && (
          <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
            <div className="hidden grid-cols-[1.5fr_1fr_.8fr_.7fr_.6fr] gap-4 border-b border-line px-5 py-4 text-[9px] font-bold tracking-[0.13em] text-ink/45 md:grid">
              <span>COLLABORATEUR</span>
              <span>EMAIL</span>
              <span>RÔLE</span>
              <span>STATUT</span>
              <span />
            </div>

            {utilisateurs.map((utilisateur) => (
              <article
                key={utilisateur.id}
                className="grid gap-4 border-b border-line px-5 py-4 last:border-0 md:grid-cols-[1.5fr_1fr_.8fr_.7fr_.6fr] md:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e7f0ef] text-xs font-bold text-[#315864]">
                    {utilisateur.prenom.charAt(0)}
                    {utilisateur.nom.charAt(0)}
                  </div>

                  <div>
                    <strong className="block text-sm text-ink">
                      {utilisateur.prenom} {utilisateur.nom}
                    </strong>

                    <span className="mt-1 block text-[10px] text-ink/45 md:hidden">
                      {utilisateur.email}
                    </span>
                  </div>
                </div>

                <span className="hidden text-xs text-ink/60 md:block">
                  {utilisateur.email}
                </span>

                <span
                  className={[
                    "w-fit rounded-full px-3 py-1.5 text-[10px] font-bold",
                    utilisateur.role === "administrateur"
                      ? "bg-[#315864] text-white"
                      : "bg-[#e7f0ef] text-[#315864]",
                  ].join(" ")}
                >
                  {utilisateur.role === "administrateur"
                    ? "Administrateur"
                    : "Collaborateur"}
                </span>

                <span
                  className={[
                    "w-fit rounded-full px-3 py-1.5 text-[10px] font-bold",
                    utilisateur.actif
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {utilisateur.actif ? "Actif" : "Désactivé"}
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setUtilisateurEnEdition(utilisateur);
                      setFormulaireOuvert(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#315864] hover:text-[#49bfa9]"
                  >
                    <Pencil size={14} />
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changerEtat.mutate({
                        id: utilisateur.id,
                        actif: utilisateur.actif,
                      })
                    }
                    disabled={changerEtat.isPending}
                    className="w-fit text-xs font-bold text-[#315864] hover:text-[#49bfa9]"
                  >
                    {utilisateur.actif ? "Désactiver" : "Réactiver"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer définitivement le compte de ${utilisateur.prenom} ${utilisateur.nom} et ses données associées ?`)) {
                        supprimer.mutate(utilisateur.id);
                      }
                    }}
                    disabled={supprimer.isPending}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              </article>
            ))}

            {utilisateurs.length === 0 && (
              <EmptyState
                icon={<Users size={22} />}
                titre="Aucun utilisateur"
                message="Aucun utilisateur n'est encore enregistré. Ajoutez votre premier utilisateur."
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FormulaireUtilisateur({
  utilisateur,
  onSucces,
}: {
  utilisateur: Utilisateur | null;
  onSucces: () => void;
}) {
  const queryClient = useQueryClient();
  const estEnEdition = utilisateur !== null;

  const { data: departements = [] } = useQuery({
    queryKey: ["departements"],
    queryFn: listerDepartements,
  });

  const [prenom, setPrenom] = useState(utilisateur?.prenom ?? "");
  const [nom, setNom] = useState(utilisateur?.nom ?? "");
  const [email, setEmail] = useState(utilisateur?.email ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<Role>(utilisateur?.role ?? "collaborateur");
  const [poste, setPoste] = useState(utilisateur?.poste ?? "");
  const [departementId, setDepartementId] = useState(utilisateur?.departement_id ?? "");
  const [erreur, setErreur] = useState<string | null>(null);

  const creer = useMutation({
    mutationFn: () => {
      if (utilisateur) {
        return modifierUtilisateur(utilisateur.id, {
          prenom,
          nom,
          email,
          role,
          poste: poste.trim() || null,
          departement_id: departementId || null,
          ...(motDePasse ? { mot_de_passe: motDePasse } : {}),
        });
      }

      return creerUtilisateur({
        prenom,
        nom,
        email,
        mot_de_passe: motDePasse,
        role,
        poste: poste.trim() || undefined,
        departement_id: departementId || undefined,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      onSucces();
    },

    onError: (error) => {
      setErreur(
        error instanceof Error
          ? error.message
          : estEnEdition
            ? "Impossible de modifier cet utilisateur."
            : "Impossible de créer cet utilisateur."
      );
    },
  });

  return (
    <section className="rounded-xl border border-line bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
          <UserPlus size={20} />
        </div>

        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            {estEnEdition ? "Modifier un utilisateur" : "Créer un utilisateur"}
          </h2>
          <p className="text-xs text-ink/55">
            {estEnEdition
              ? "Vous pouvez modifier les informations, les accès et le mot de passe de ce compte."
              : "Le mot de passe est chiffré par le backend avant stockage."}
          </p>
        </div>
      </div>

      <form
        className="mt-7 grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setErreur(null);
          creer.mutate();
        }}
      >
        {erreur && (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{erreur}</p>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Prénom
            <input
              required
              value={prenom}
              onChange={(event) => setPrenom(event.target.value)}
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Nom
            <input
              required
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>
        </div>

        <label className="grid gap-2 text-xs font-bold text-ink">
          Adresse professionnelle
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom.nom@exia.fr"
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <label className="grid gap-2 text-xs font-bold text-ink">
          {estEnEdition ? "Nouveau mot de passe (facultatif)" : "Mot de passe temporaire"}
          <input
            required={!estEnEdition}
            type="password"
            value={motDePasse}
            onChange={(event) => setMotDePasse(event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Rôle
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            >
              <option value="collaborateur">Collaborateur</option>
              <option value="administrateur">Administrateur</option>
            </select>
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Poste
            <input
              value={poste}
              onChange={(event) => setPoste(event.target.value)}
              placeholder="Exemple : Consultant cybersécurité"
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Département
            <select
              value={departementId}
              onChange={(event) => setDepartementId(event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            >
              <option value="">Aucun département</option>

              {departements.map((departement) => (
                <option key={departement.id} value={departement.id}>
                  {departement.nom}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="submit"
          disabled={creer.isPending}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-[#315864] px-5 py-3 text-xs font-bold text-white hover:bg-[#1f3e47]"
        >
          <Check size={15} />
          {creer.isPending
            ? estEnEdition
              ? "Enregistrement…"
              : "Création…"
            : estEnEdition
              ? "Enregistrer les modifications"
              : "Créer l’utilisateur"}
        </button>
      </form>
    </section>
  );
}
