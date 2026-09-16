import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  FileText,
  Heart,
  LockKeyhole,
  MessageCircle,
  Play,
  Send,
  Sparkles,
} from "lucide-react";

import { obtenirFormation } from "../../api/formations";
import {
  lireProgressionContenus,
  listerContenus,
  terminerContenu,
} from "../../api/contenus";
import { listerQuestionnaires } from "../../api/questionnaires";
import { mesTentatives } from "../../api/tentatives";
import {
  aimerCommentaire,
  creerCommentaire,
  genererAssistant,
  listerCommentaires,
  poserQuestionAssistant,
  retirerLikeCommentaire,
} from "../../api/assistant";
import { API_BASE_URL } from "../../api/client";
import { LecteurContenu } from "../../components/LecteurContenu";
import type { Commentaire, Contenu, ModeGeneration } from "../../api/types";
import { formaterDureeContenu } from "../../lib/duree";

const modes: { valeur: ModeGeneration; libelle: string }[] = [
  { valeur: "resume", libelle: "Résumé" },
  { valeur: "points_cles", libelle: "Points clés" },
  { valeur: "explication_simple", libelle: "Simplifier" },
  { valeur: "quiz", libelle: "Quiz de révision" },
  { valeur: "questions_revision", libelle: "Questions" },
];

function urlContenu(type: string, cheminFichier: string) {
  if (type === "lien") return cheminFichier;
  return `${API_BASE_URL}/uploads/${cheminFichier}`;
}

function libelleStatutIndexation(statut: string) {
  const libelles: Record<string, string> = {
    en_attente: "Préparation IA",
    en_cours: "Indexation IA en cours",
    terminee: "Disponible dans l’assistant",
    echec: "Indexation à vérifier",
    non_indexable: "Non indexable",
  };

  return libelles[statut] ?? statut;
}

function couleurStatutIndexation(statut: string) {
  const couleurs: Record<string, string> = {
    en_attente: "bg-slate-100 text-slate-600",
    en_cours: "bg-amber-100 text-amber-800",
    terminee: "bg-[#d8f5ef] text-[#21665a]",
    echec: "bg-red-100 text-red-700",
    non_indexable: "bg-slate-100 text-slate-600",
  };

  return couleurs[statut] ?? "bg-slate-100 text-slate-600";
}

function dateLisible(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function FormationDetail() {
  const { formationId } = useParams<{ formationId: string }>();
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState("");
  const [contenuId, setContenuId] = useState("");
  const [mode, setMode] = useState<ModeGeneration>("resume");
  const [commentaire, setCommentaire] = useState("");
  const [reponseA, setReponseA] = useState<Commentaire | null>(null);
  const [contenuActif, setContenuActif] = useState<Contenu | null>(null);

  const { data: formation, isLoading: chargeFormation } = useQuery({
    queryKey: ["formation", formationId],
    queryFn: () => obtenirFormation(formationId!),
    enabled: Boolean(formationId),
  });

  const { data: contenus = [], isLoading: chargeContenus } = useQuery({
    queryKey: ["contenus", formationId],
    queryFn: () => listerContenus(formationId!),
    enabled: Boolean(formationId),
  });

  const { data: progressionContenus } = useQuery({
    queryKey: ["progression-contenus", formationId],
    queryFn: () => lireProgressionContenus(formationId!),
    enabled: Boolean(formationId),
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ["questionnaires", formationId],
    queryFn: () => listerQuestionnaires(formationId!),
    enabled: Boolean(formationId),
  });

  const { data: commentaires = [] } = useQuery({
    queryKey: ["commentaires", formationId],
    queryFn: () => listerCommentaires(formationId!),
    enabled: Boolean(formationId),
  });

  const questionnaire = questionnaires[0];

  const { data: tentatives = [] } = useQuery({
    queryKey: ["mes-tentatives", questionnaire?.id],
    queryFn: () => mesTentatives(questionnaire!.id),
    enabled: Boolean(questionnaire?.id),
  });

  const contenusTermines = useMemo(
    () => new Set(progressionContenus?.contenu_ids_termines ?? []),
    [progressionContenus]
  );

  const pourcentage = contenus.length
    ? Math.round((contenusTermines.size / contenus.length) * 100)
    : 0;
  const contenusComplets = contenus.length > 0 && contenusTermines.size === contenus.length;

  const questionAssistant = useMutation({
    mutationFn: () => poserQuestionAssistant(formationId!, question),
  });

  const generationAssistant = useMutation({
    mutationFn: () => genererAssistant(contenuId, mode),
  });

  const terminer = useMutation({
    mutationFn: ({ contenuId, dureeConsulteeSecondes }: { contenuId: string; dureeConsulteeSecondes: number }) =>
      terminerContenu(contenuId, dureeConsulteeSecondes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["progression-contenus", formationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["mes-progressions"],
      });
    },
  });

  const ajouterCommentaire = useMutation({
    mutationFn: () =>
      creerCommentaire(formationId!, commentaire, reponseA?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commentaires", formationId],
      });
      setCommentaire("");
      setReponseA(null);
    },
  });

  const changerLike = useMutation({
    mutationFn: ({ id, aime }: { id: string; aime: boolean }) =>
      aime
        ? retirerLikeCommentaire(formationId!, id)
        : aimerCommentaire(formationId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commentaires", formationId],
      });
    },
  });

  const commentairesPrincipaux = useMemo(
    () => commentaires.filter((element) => element.parent_id === null),
    [commentaires]
  );

  const derniereTentative = [...tentatives]
    .filter((tentative) => tentative.statut === "terminee")
    .sort((a, b) => (b.date_passage ?? "").localeCompare(a.date_passage ?? ""))[0];
  const nombreTentativesUtilisees = tentatives.length;
  const tentativeLimitee = questionnaire?.nombre_tentatives_max !== null &&
    questionnaire?.nombre_tentatives_max !== undefined;
  const nombreTentativesMax = questionnaire?.nombre_tentatives_max ?? null;
  const tentativesEpuisees =
    tentativeLimitee &&
    nombreTentativesMax !== null &&
    nombreTentativesUtilisees >= nombreTentativesMax;
  const chargement = chargeFormation || chargeContenus;

  if (chargement) {
    return <p className="text-sm text-ink/60">Chargement de la formation…</p>;
  }

  if (!formation) {
    return <p className="text-sm text-red-700">Formation introuvable.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/espace/formations"
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-[#315864]"
      >
        <ArrowLeft size={15} />
        Retour aux formations
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl bg-[#315864] text-white">
        <div className="grid gap-7 p-7 md:grid-cols-[1fr_235px] md:p-10">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
              <Sparkles size={14} />
              FORMATION EXIA ACADEMY
            </span>

            <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
              {formation.titre}
            </h1>

            {formation.description && (
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75">
                {formation.description}
              </p>
            )}

            <div className="mt-8 max-w-xl">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Votre progression</span>
                <span>{pourcentage}%</span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#49bfa9] transition-all"
                  style={{ width: `${pourcentage}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-white/65">
                {contenusTermines.size} ressource(s) terminée(s) sur {contenus.length}.
              </p>
            </div>
          </div>

          <aside className="self-end rounded-xl bg-white p-5 text-[#17262a]">
            <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
              ÉVALUATION
            </span>

            <p className="mt-3 text-xs leading-relaxed text-ink/60">
              {questionnaire
                ? `${questionnaire.titre} · score minimum ${questionnaire.score_minimum_reussite}%`
                : "Aucun questionnaire n’est encore disponible."}
            </p>

            {questionnaire && (
              <>
                {tentativeLimitee && nombreTentativesMax !== null && (
                  <p className="mt-3 text-[11px] text-ink/55">
                    Tentatives : {nombreTentativesUtilisees} / {nombreTentativesMax}
                  </p>
                )}

                {derniereTentative && contenusComplets && (
                  <div
                    className={[
                      "mt-5 rounded-lg p-3 text-xs",
                      derniereTentative.reussi
                        ? "bg-[#d8f5ef] text-[#21665a]"
                        : "bg-[#fff3e8] text-[#a45012]",
                    ].join(" ")}
                  >
                    <strong className="block">
                      Dernier résultat : {derniereTentative.score ?? 0}%
                    </strong>
                    <span className="mt-1 block">
                      {derniereTentative.reussi
                        ? "Évaluation validée."
                        : "Évaluation non validée — vous pouvez recommencer selon les règles du questionnaire."}
                    </span>
                  </div>
                )}

                {tentativesEpuisees ? (
                  <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-800">
                    Nombre maximal de tentatives atteint ({nombreTentativesMax}).
                  </div>
                ) : contenusComplets ? (
                  <Link
                    to={`/espace/formations/${formation.id}/quiz/${questionnaire.id}`}
                    className="mt-5 flex items-center justify-center gap-2 rounded-md bg-[#315864] px-4 py-3 text-xs font-bold text-white hover:bg-[#1f3e47]"
                  >
                    {derniereTentative ? "Repasser le quiz" : "Passer le quiz"}
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <div className="mt-5 rounded-md bg-[#f1f6f5] px-4 py-3 text-xs text-ink/60">
                    <span className="flex items-center gap-2 font-bold text-[#315864]">
                      <LockKeyhole size={14} /> Quiz verrouillé
                    </span>
                    <span className="mt-1 block">
                      {contenus.length === 0
                        ? "Aucune ressource n’est encore disponible. Le quiz sera débloqué après l’ajout et la validation de contenus."
                        : `Terminez les ${contenus.length - contenusTermines.size} ressource(s) restante(s) pour le débloquer.`}
                    </span>
                  </div>
                )}

                {derniereTentative && contenusComplets && (
                  <Link
                    to="/espace/resultats"
                    className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-[#315864] hover:text-[#1f3e47]"
                  >
                    Voir tous mes résultats
                    <ArrowRight size={14} />
                  </Link>
                )}
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-[#e7f0ef] text-[#315864]">
            <FileText size={18} />
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
              Parcours de formation
            </h2>
            <p className="text-xs text-ink/55">
              Consultez chaque ressource : la validation est enregistrée automatiquement après la durée requise.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {contenus.map((contenu) => {
            const estTermine = contenusTermines.has(contenu.id);
            const estVideo = contenu.type === "video";
            const estPdfOuPresentation =
              contenu.type === "pdf" ||
              contenu.type === "presentation" ||
              contenu.chemin_fichier.toLowerCase().endsWith(".pdf");

            const contenuInterieur = (
              <>
                <div
                  className={[
                    "grid h-12 w-12 shrink-0 place-items-center rounded-md",
                    estTermine
                      ? "bg-[#49bfa9] text-[#17262a]"
                      : "bg-[#e7f0ef] text-[#315864]",
                  ].join(" ")}
                >
                  {estTermine ? (
                    <Check size={20} />
                  ) : estVideo ? (
                    <Play size={20} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#315864]">
                      {contenu.type}
                    </span>
                    {(estVideo || estPdfOuPresentation) && !estTermine && (
                      <span className="rounded-full bg-[#315864] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                        Suivi auto
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 truncate text-sm font-bold text-ink">
                    {contenu.titre}
                  </h3>

                  <p className="mt-2 text-xs text-ink/55">
                    Ressource {contenu.ordre}
                    {contenu.duree_secondes
                      ? ` · ${formaterDureeContenu(contenu.duree_secondes)}`
                      : ""}
                  </p>
                </div>

                <ChevronRight
                  size={17}
                  className="mt-2 text-ink/35 group-hover:text-[#315864]"
                />
              </>
            );

            return (
              <article
                key={contenu.id}
                className={[
                  "rounded-xl border bg-white p-5 transition",
                  estTermine
                    ? "border-[#49bfa9] ring-1 ring-[#49bfa9]/20"
                    : "border-line hover:border-[#49bfa9]",
                ].join(" ")}
              >
                {estVideo || estPdfOuPresentation ? (
                  <button
                    type="button"
                    onClick={() => setContenuActif(contenu)}
                    className="group flex w-full items-start gap-4 text-left"
                  >
                    {contenuInterieur}
                  </button>
                ) : (
                  <a
                    href={urlContenu(contenu.type, contenu.chemin_fichier)}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-4"
                  >
                    {contenuInterieur}
                  </a>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span
                    className={[
                      "rounded-full px-3 py-1.5 text-[9px] font-bold",
                      couleurStatutIndexation(contenu.statut_ingestion),
                    ].join(" ")}
                  >
                    {libelleStatutIndexation(contenu.statut_ingestion)}
                  </span>

                  <span
                    className={[
                      "rounded-md px-3 py-2 text-xs font-bold",
                      estTermine
                        ? "bg-[#e7f0ef] text-[#315864]"
                        : "bg-[#f1f6f5] text-ink/55",
                    ].join(" ")}
                  >
                    {estTermine ? "Terminé" : "À terminer"}
                  </span>
                </div>

                {contenu.statut_ingestion === "echec" &&
                  contenu.erreur_ingestion && (
                    <p className="mt-3 text-xs text-red-700">
                      {contenu.erreur_ingestion}
                    </p>
                  )}
              </article>
            );
          })}

          {contenus.length === 0 && (
            <div className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-ink/55">
              Aucun contenu n’a encore été ajouté à cette formation.
            </div>
          )}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-xl border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#315864] text-white">
              <Bot size={20} />
            </div>

            <div>
              <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
                Assistant IA
              </h2>
              <p className="text-xs text-ink/55">
                Réponses basées sur les ressources indexées de cette formation.
              </p>
            </div>
          </div>

          <form
            className="mt-6 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) questionAssistant.mutate();
            }}
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Posez une question sur cette formation…"
              className="min-w-0 flex-1 rounded-md border border-line bg-white px-4 py-3 text-sm text-[#17262A] placeholder:text-[#607479] outline-none focus:border-[#49bfa9]"
            />

            <button
              type="submit"
              disabled={!question.trim() || questionAssistant.isPending}
              className="grid h-11 w-11 place-items-center rounded-md bg-[#315864] text-white hover:bg-[#1f3e47] disabled:opacity-50"
              aria-label="Envoyer la question"
            >
              <Send size={17} />
            </button>
          </form>

          {questionAssistant.isError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {questionAssistant.error instanceof Error
                ? questionAssistant.error.message
                : "L’assistant ne peut pas répondre pour le moment."}
            </p>
          )}

          {questionAssistant.data && (
            <div className="mt-5 rounded-lg bg-[#e7f0ef] p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#17313a]">
                {questionAssistant.data.reponse}
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-line bg-white p-6">
          <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
            RÉVISION RAPIDE
          </span>

          <h2 className="mt-3 font-display text-2xl font-medium tracking-[-0.04em] text-ink">
            Générer avec l’IA
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-ink/55">
            Obtiens un support de révision à partir d’une ressource indexée.
          </p>

          <select
            value={contenuId}
            onChange={(event) => setContenuId(event.target.value)}
            className="mt-5 w-full rounded-md border border-line bg-white px-3 py-3 text-xs text-[#17262A] outline-none focus:border-[#49bfa9]"
          >
            <option value="">Choisir une ressource</option>

            {contenus
              .filter((contenu) => contenu.statut_ingestion === "terminee")
              .map((contenu) => (
              <option key={contenu.id} value={contenu.id} className="bg-white text-[#17262A]">
                  {contenu.titre}
                </option>
              ))}
          </select>

          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as ModeGeneration)}
            className="mt-3 w-full rounded-md border border-line bg-white px-3 py-3 text-xs text-[#17262A] outline-none focus:border-[#49bfa9]"
          >
            {modes.map((element) => (
              <option key={element.valeur} value={element.valeur} className="bg-white text-[#17262A]">
                {element.libelle}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => generationAssistant.mutate()}
            disabled={!contenuId || generationAssistant.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#49bfa9] px-4 py-3 text-xs font-bold text-[#17313a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={15} />
            {generationAssistant.isPending ? "Génération…" : "Générer"}
          </button>

          {generationAssistant.data && (
            <div className="mt-5 rounded-lg bg-[#f7faf9] p-4">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink/70">
                {generationAssistant.data.reponse}
              </p>
            </div>
          )}
        </aside>
      </section>

      <section className="mt-12 rounded-xl border border-line bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
            <MessageCircle size={20} />
          </div>

          <div>
            <h2 className="font-display text-2xl font-medium tracking-[-0.04em] text-ink">
              Discussions
            </h2>
            <p className="text-xs text-ink/55">
              Échangez avec les autres collaborateurs et les administrateurs.
            </p>
          </div>
        </div>

        {reponseA && (
          <div className="mt-5 flex items-center justify-between rounded-lg bg-[#e7f0ef] px-4 py-3 text-xs text-[#315864]">
            <span>
              Réponse à {reponseA.auteur_prenom} {reponseA.auteur_nom}
            </span>

            <button
              type="button"
              onClick={() => setReponseA(null)}
              className="font-bold hover:underline"
            >
              Annuler
            </button>
          </div>
        )}

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (commentaire.trim()) ajouterCommentaire.mutate();
          }}
        >
          <textarea
            value={commentaire}
            onChange={(event) => setCommentaire(event.target.value)}
            placeholder="Partagez une question, une idée ou un retour…"
            className="min-h-28 w-full resize-y rounded-md border border-line px-4 py-3 text-sm outline-none focus:border-[#49bfa9]"
          />

          <button
            type="submit"
            disabled={!commentaire.trim() || ajouterCommentaire.isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#315864] px-4 py-3 text-xs font-bold text-white hover:bg-[#1f3e47] disabled:opacity-50"
          >
            <Send size={15} />
            Publier
          </button>
        </form>

        <div className="mt-8 space-y-5">
          {commentairesPrincipaux.map((element) => {
            const reponses = commentaires.filter(
              (commentaireItem) => commentaireItem.parent_id === element.id
            );

            return (
              <article key={element.id} className="rounded-lg bg-[#f7faf9] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {element.auteur_prenom} {element.auteur_nom}
                    </p>
                    <p className="mt-1 text-[10px] text-ink/45">
                      {dateLisible(element.date_creation)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      changerLike.mutate({
                        id: element.id,
                        aime: element.aime_par_moi,
                      })
                    }
                    className={[
                      "inline-flex items-center gap-1 text-xs font-bold",
                      element.aime_par_moi
                        ? "text-rose-600"
                        : "text-ink/45 hover:text-rose-600",
                    ].join(" ")}
                  >
                    <Heart size={15} fill={element.aime_par_moi ? "currentColor" : "none"} />
                    {element.nb_likes}
                  </button>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/75">
                  {element.contenu}
                </p>

                <button
                  type="button"
                  onClick={() => setReponseA(element)}
                  className="mt-4 text-xs font-bold text-[#315864] hover:underline"
                >
                  Répondre
                </button>

                {reponses.length > 0 && (
                  <div className="mt-5 space-y-3 border-l-2 border-[#49bfa9] pl-4">
                    {reponses.map((reponse) => (
                      <div key={reponse.id}>
                        <p className="text-xs font-bold text-ink">
                          {reponse.auteur_prenom} {reponse.auteur_nom}
                        </p>
                        <p className="mt-1 text-sm text-ink/70">
                          {reponse.contenu}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}

          {commentairesPrincipaux.length === 0 && (
            <p className="rounded-lg border border-dashed border-line p-5 text-sm text-ink/55">
              Aucun échange pour le moment. Lancez la discussion.
            </p>
          )}
        </div>
      </section>

      <LecteurContenu
        contenu={contenuActif}
        ouvert={contenuActif !== null}
        formationId={formationId ?? ""}
        surFermeture={() => setContenuActif(null)}
        surComplet={(contenuId, dureeConsulteeSecondes) => {
          if (!contenusTermines.has(contenuId)) {
            terminer.mutate({ contenuId, dureeConsulteeSecondes });
          }
        }}
      />
    </div>
  );
}
