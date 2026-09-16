import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Link2,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import {
  creerAffectation,
  listerAffectations,
  supprimerAffectation,
} from "../../api/affectations";
import { listerFormations } from "../../api/formations";
import { listerDepartements, listerUtilisateurs } from "../../api/utilisateurs";

type Cible = "departement" | "utilisateur";

export function Affectations() {
  const queryClient = useQueryClient();

  const [cible, setCible] = useState<Cible>("departement");
  const [formationId, setFormationId] = useState("");
  const [cibleId, setCibleId] = useState("");
  const [dateLimite, setDateLimite] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  const { data: departements = [] } = useQuery({
    queryKey: ["departements"],
    queryFn: listerDepartements,
  });

  const { data: utilisateurs = [] } = useQuery({
    queryKey: ["utilisateurs-actifs"],
    queryFn: () => listerUtilisateurs(true),
  });

  const { data: affectations = [] } = useQuery({
    queryKey: ["affectations"],
    queryFn: () => listerAffectations(),
  });

  const creer = useMutation({
    mutationFn: () =>
      creerAffectation({
        formation_id: formationId,
        utilisateur_id: cible === "utilisateur" ? cibleId : undefined,
        departement_id: cible === "departement" ? cibleId : undefined,
        date_limite: dateLimite || undefined,
      }),

    onSuccess: (affectation) => {
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      queryClient.invalidateQueries({ queryKey: ["mes-progressions"] });

      setMessage(
        affectation.nombre_progressions_generees > 0
          ? `Affectation créée : ${affectation.nombre_progressions_generees} collaborateur(s) concerné(s).`
          : "Affectation créée. Le collaborateur disposait déjà de cette formation."
      );

      setCibleId("");
      setDateLimite("");
    },

    onError: (error) => {
      setErreur(
        error instanceof Error ? error.message : "Impossible de créer l’affectation."
      );
    },
  });

  const supprimer = useMutation({
    mutationFn: (affectationId: string) => supprimerAffectation(affectationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affectations"] });
      queryClient.invalidateQueries({ queryKey: ["progressions"] });
      queryClient.invalidateQueries({ queryKey: ["mes-progressions"] });
      setErreur(null);
      setMessage("Affectation retirée. Les progressions associées ont été supprimées.");
    },
    onError: (error) => {
      setMessage(null);
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible de retirer cette affectation."
      );
    },
  });

  return (
    <div>
      <section className="overflow-hidden rounded-xl bg-[#315864] p-7 text-white md:p-10">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
          <Link2 size={14} />
          PILOTAGE DES PARCOURS
        </span>

        <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
          Affectations
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">
          Associez les formations aux collaborateurs individuellement ou à
          l’ensemble d’un département.
        </p>
      </section>

      <section className="mt-7 rounded-xl border border-line bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
            <Sparkles size={20} />
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium text-ink">
              Nouvelle affectation
            </h2>
            <p className="text-xs text-ink/55">
              Les progressions et notifications sont créées automatiquement par le backend.
            </p>
          </div>
        </div>

        <form
          className="mt-7 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            setErreur(null);
            setMessage(null);
            creer.mutate();
          }}
        >
          {erreur && (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{erreur}</p>
          )}

          {message && (
            <p className="rounded-lg bg-[#e7f0ef] p-4 text-sm text-[#315864]">
              {message}
            </p>
          )}

          <label className="grid gap-2 text-xs font-bold text-ink">
            Formation à affecter
            <select
              required
              value={formationId}
              onChange={(event) => setFormationId(event.target.value)}
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

          <div>
            <span className="text-xs font-bold text-ink">Public concerné</span>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCible("departement");
                  setCibleId("");
                }}
                className={[
                  "inline-flex items-center gap-2 rounded-md border px-4 py-3 text-xs font-bold",
                  cible === "departement"
                    ? "border-[#315864] bg-[#315864] text-white"
                    : "border-line bg-white text-ink/60",
                ].join(" ")}
              >
                <Users size={15} />
                Un département
              </button>

              <button
                type="button"
                onClick={() => {
                  setCible("utilisateur");
                  setCibleId("");
                }}
                className={[
                  "inline-flex items-center gap-2 rounded-md border px-4 py-3 text-xs font-bold",
                  cible === "utilisateur"
                    ? "border-[#315864] bg-[#315864] text-white"
                    : "border-line bg-white text-ink/60",
                ].join(" ")}
              >
                <UserRound size={15} />
                Un collaborateur
              </button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold text-ink">
              {cible === "departement" ? "Département" : "Collaborateur"}

              <select
                required
                value={cibleId}
                onChange={(event) => setCibleId(event.target.value)}
                className="rounded-md border border-line bg-white px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
              >
                <option value="">Sélectionner</option>

                {cible === "departement"
                  ? departements.map((departement) => (
                      <option key={departement.id} value={departement.id}>
                        {departement.nom}
                      </option>
                    ))
                  : utilisateurs.map((utilisateur) => (
                      <option key={utilisateur.id} value={utilisateur.id}>
                        {utilisateur.prenom} {utilisateur.nom}
                      </option>
                    ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs font-bold text-ink">
              Date limite facultative

              <span className="relative">
                <input
                  type="date"
                  value={dateLimite}
                  onChange={(event) => setDateLimite(event.target.value)}
                  className="w-full rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
                />

                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute right-3 top-3 text-ink/45"
                />
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={creer.isPending}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a] disabled:opacity-60"
          >
            <Check size={15} />
            {creer.isPending ? "Affectation…" : "Affecter la formation"}
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
          Affectations récentes
        </h2>

        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white">
          {affectations.map((affectation) => {
            const formation = formations.find(
              (element) => element.id === affectation.formation_id
            );

            const departement = departements.find(
              (element) => element.id === affectation.departement_id
            );

            const utilisateur = utilisateurs.find(
              (element) => element.id === affectation.utilisateur_id
            );

            return (
              <article
                key={affectation.id}
                className="flex flex-col gap-4 border-b border-line px-5 py-4 last:border-0 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <strong className="block text-sm text-ink">
                    {formation?.titre ?? "Formation"}
                  </strong>

                  <span className="mt-1 block text-[11px] text-ink/55">
                    {departement
                      ? `Département : ${departement.nom}`
                      : utilisateur
                        ? `Collaborateur : ${utilisateur.prenom} ${utilisateur.nom}`
                        : "Cible non disponible"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {affectation.date_limite && (
                    <span className="text-[11px] text-ink/55">
                      Échéance :{" "}
                      {new Date(affectation.date_limite).toLocaleDateString("fr-FR")}
                    </span>
                  )}

                  <span className="rounded-full bg-[#e7f0ef] px-3 py-1.5 text-[10px] font-bold text-[#315864]">
                    {affectation.nombre_progressions_generees} progression(s)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const cible = departement
                        ? `le département « ${departement.nom} »`
                        : utilisateur
                          ? `${utilisateur.prenom} ${utilisateur.nom}`
                          : "cette cible";

                      if (
                        window.confirm(
                          `Retirer l’affectation « ${formation?.titre ?? "Formation"} » pour ${cible} ?\n\nLes progressions créées par cette affectation seront également supprimées.`
                        )
                      ) {
                        setErreur(null);
                        setMessage(null);
                        supprimer.mutate(affectation.id);
                      }
                    }}
                    disabled={supprimer.isPending}
                    className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Retirer
                  </button>
                </div>
              </article>
            );
          })}

          {affectations.length === 0 && (
            <p className="p-6 text-sm text-ink/55">
              Aucune affectation n’a encore été créée.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
