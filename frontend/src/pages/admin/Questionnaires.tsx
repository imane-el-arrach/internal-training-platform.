import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookMarked,
  Check,
  ClipboardList,
  FileUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { listerFormations } from "../../api/formations";
import {
  creerQuestion,
  creerQuestionsLot,
  creerQuestionnaire,
  listerQuestionsAdmin,
  listerQuestionnaires,
  listerTentativesQuestionnaire,
  modifierQuestion,
  modifierQuestionnaire,
  modifierReponsesQuestion,
  supprimerQuestion,
  supprimerQuestionnaire,
} from "../../api/questionnaires";
import type { QuestionAdmin } from "../../api/types";
import { useToast } from "../../components/ui/Toast";
import { EmptyState } from "../../components/ui/Primitives";
import { formaterDureeQuestionnaire } from "../../lib/duree";
import {
  ajouterQuestionBanqueAuQuestionnaire,
  ajouterQuestionDansBanque,
  listerBanqueQuestions,
  supprimerQuestionBanque,
} from "../../api/banqueQuestions";

export function Questionnaires() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [formationId, setFormationId] = useState("");
  const [questionnaireId, setQuestionnaireId] = useState("");
  const [formulaireQuestionnaire, setFormulaireQuestionnaire] =
    useState(false);
  const [formulaireQuestion, setFormulaireQuestion] = useState(false);
  const [importLot, setImportLot] = useState(false);
  const [banqueOuverte, setBanqueOuverte] = useState(false);

  const [questionnaireEnEdition, setQuestionnaireEnEdition] = useState<
    string | null
  >(null);

  const [questionEnEdition, setQuestionEnEdition] = useState<string | null>(
    null
  );
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: () => listerFormations(),
  });

  const { data: questionnaires = [] } = useQuery({
    queryKey: ["questionnaires", formationId],
    queryFn: () => listerQuestionnaires(formationId),
    enabled: Boolean(formationId),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["questions-admin", questionnaireId],
    queryFn: () => listerQuestionsAdmin(questionnaireId),
    enabled: Boolean(questionnaireId),
  });

  const { data: tentatives = [] } = useQuery({
    queryKey: ["tentatives-questionnaire", questionnaireId],
    queryFn: () => listerTentativesQuestionnaire(questionnaireId),
    enabled: Boolean(questionnaireId),
  });

  const { data: questionsBanque = [] } = useQuery({
    queryKey: ["banque-questions"],
    queryFn: listerBanqueQuestions,
    enabled: Boolean(questionnaireId) && banqueOuverte,
  });

  const sauvegarderDansBanque = useMutation({
    mutationFn: ajouterQuestionDansBanque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banque-questions"] });
      toast.succes("Question enregistrée dans la banque.");
    },
    onError: (error) => setErreurAction(error instanceof Error ? error.message : "Impossible d’enregistrer cette question dans la banque."),
  });

  const ajouterDepuisBanque = useMutation({
    mutationFn: (questionBanqueId: string) => ajouterQuestionBanqueAuQuestionnaire(questionBanqueId, questionnaireId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions-admin", questionnaireId] });
      toast.succes("Question ajoutée au questionnaire.");
    },
    onError: (error) => setErreurAction(error instanceof Error ? error.message : "Impossible d’ajouter cette question."),
  });

  const supprimerDeLaBanque = useMutation({
    mutationFn: supprimerQuestionBanque,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["banque-questions"] }),
    onError: (error) => setErreurAction(error instanceof Error ? error.message : "Impossible de supprimer cette question de la banque."),
  });

  const tentativesTerminees = tentatives.filter(
    (tentative) => tentative.statut === "terminee"
  );

  const tentativesReussies = tentativesTerminees.filter(
    (tentative) => tentative.reussi
  );

  const tauxReussite = tentativesTerminees.length
    ? Math.round(
        (tentativesReussies.length / tentativesTerminees.length) * 100
      )
    : 0;

  const scoreMoyen = tentativesTerminees.length
    ? Math.round(
        tentativesTerminees.reduce(
          (total, tentative) => total + (tentative.score ?? 0),
          0
        ) / tentativesTerminees.length
      )
    : 0;

  const supprimerUneQuestion = useMutation({
    mutationFn: (questionId: string) =>
      supprimerQuestion(questionnaireId, questionId),

    onSuccess: () => {
      setQuestionEnEdition(null);

      queryClient.invalidateQueries({
        queryKey: ["questions-admin", questionnaireId],
      });

      toast.succes("Question supprimée avec succès.");
    },

    onError: (error) => {
      setErreurAction(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette question."
      );
    },
  });

  const supprimerUnQuestionnaire = useMutation({
    mutationFn: (questionnaire: { id: string }) =>
      supprimerQuestionnaire(formationId, questionnaire.id),

    onSuccess: (_resultat, questionnaire) => {
      if (questionnaireId === questionnaire.id) {
        setQuestionnaireId("");
        setFormulaireQuestion(false);
        setQuestionEnEdition(null);
      }

      queryClient.invalidateQueries({
        queryKey: ["questionnaires", formationId],
      });

      toast.succes("Questionnaire supprimé avec succès.");
    },

    onError: (error) => {
      setErreurAction(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce questionnaire."
      );
    },
  });

  const deplacerQuestion = useMutation({
    mutationFn: async ({
      question,
      direction,
    }: {
      question: QuestionAdmin;
      direction: "haut" | "bas";
    }) => {
      const index = questions.findIndex((q) => q.id === question.id);
      if (index === -1) return;

      const indexCible = direction === "haut" ? index - 1 : index + 1;
      if (indexCible < 0 || indexCible >= questions.length) return;

      const questionCible = questions[indexCible];

      await modifierQuestion(questionnaireId, question.id, {
        ordre: questionCible.ordre,
      });
      await modifierQuestion(questionnaireId, questionCible.id, {
        ordre: question.ordre,
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["questions-admin", questionnaireId],
      });
    },

    onError: (error) => {
      toast.erreur(
        error instanceof Error
          ? error.message
          : "Impossible de réordonner les questions.",
      );
    },
  });

  return (
    <div>
      <section className="overflow-hidden rounded-xl bg-[#315864] p-7 text-white md:p-10">
        <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#49bfa9]">
          <ClipboardList size={14} />
          ÉVALUATIONS ET VALIDATION
        </span>

        <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
          Questionnaires
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75">
          Configurez les quiz, les règles de réussite, le temps imparti et les
          questions de validation.
        </p>
      </section>

      <section className="mt-7 rounded-xl border border-line bg-white p-6">
        <label className="grid max-w-xl gap-2 text-xs font-bold text-ink">
          Formation concernée

          <select
            value={formationId}
            onChange={(event) => {
              setFormationId(event.target.value);
              setQuestionnaireId("");
              setFormulaireQuestionnaire(false);
              setFormulaireQuestion(false);
              setQuestionnaireEnEdition(null);
              setQuestionEnEdition(null);
              setErreurAction(null);
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
      </section>

      {formationId && (
        <section className="mt-8">
          {erreurAction && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <span>{erreurAction}</span>
              <button
                type="button"
                onClick={() => setErreurAction(null)}
                className="font-bold hover:underline"
              >
                Fermer
              </button>
            </div>
          )}

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-2xl font-medium text-ink">
                Questionnaires de la formation
              </h2>

              <p className="mt-1 text-xs text-ink/55">
                Créez une évaluation avant d’ajouter ses questions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setQuestionnaireEnEdition(null);
                setFormulaireQuestionnaire((ouvert) => !ouvert);
              }}
              className="inline-flex items-center gap-2 rounded-md bg-[#315864] px-4 py-3 text-xs font-bold text-white"
            >
              {formulaireQuestionnaire ? <X size={15} /> : <Plus size={15} />}
              {formulaireQuestionnaire
                ? "Fermer"
                : "Créer un questionnaire"}
            </button>
          </div>

          {formulaireQuestionnaire && (
            <div className="mt-5">
              <FormulaireQuestionnaire
                key={questionnaireEnEdition ?? "nouveau"}
                formationId={formationId}
                questionnaire={
                  questionnaires.find(
                    (element) => element.id === questionnaireEnEdition
                  ) ?? null
                }
                onSucces={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["questionnaires", formationId],
                  });

                  setQuestionnaireEnEdition(null);
                  setFormulaireQuestionnaire(false);
                }}
              />
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {questionnaires.map((questionnaire) => (
              <div
                key={questionnaire.id}
                className={[
                  "rounded-xl border p-5 transition",
                  questionnaireId === questionnaire.id
                    ? "border-[#315864] bg-[#e7f0ef]"
                    : "border-line bg-white hover:border-[#49bfa9]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuestionnaireId(questionnaire.id);
                    setFormulaireQuestion(false);
                    setQuestionEnEdition(null);
                  }}
                  className="w-full text-left"
                >
                  <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
                    QUESTIONNAIRE
                  </span>

                  <h3 className="mt-3 font-display text-xl font-medium text-ink">
                    {questionnaire.titre}
                  </h3>

                  <p className="mt-3 text-xs text-ink/55">
                    Score minimum :{" "}
                    {questionnaire.score_minimum_reussite}%<br />
                    Tentatives :{" "}
                    {questionnaire.nombre_tentatives_max ?? "Illimitées"}
                    <br />
                    Temps :{" "}
                    {formaterDureeQuestionnaire(questionnaire.temps_limite_secondes)}
                  </p>
                </button>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      setQuestionnaireEnEdition(questionnaire.id);
                      setFormulaireQuestionnaire(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-md bg-[#e7f0ef] px-3 py-2 text-xs font-bold text-[#315864] hover:bg-[#d8f5ef]"
                  >
                    <Pencil size={14} />
                    Modifier
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      if (
                        window.confirm(
                          `Supprimer le questionnaire « ${questionnaire.titre} » et ses questions ?`
                        )
                      ) {
                        setErreurAction(null);
                        supprimerUnQuestionnaire.mutate({
                          id: questionnaire.id,
                        });
                      }
                    }}
                    disabled={supprimerUnQuestionnaire.isPending}
                    className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            {questionnaires.length === 0 && (
              <EmptyState
                icon={<ClipboardList size={22} />}
                titre="Aucun questionnaire"
                message="Créez une évaluation pour cette formation."
              />
            )}
          </div>
        </section>
      )}

      {questionnaireId && (
        <section className="mt-10 border-t border-line pt-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-display text-2xl font-medium text-ink">
                Questions du questionnaire
              </h2>

              <p className="mt-1 text-xs text-ink/55">
                Les réponses correctes ne seront jamais transmises au
                collaborateur.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormulaireQuestion(false);
                  setImportLot(false);
                  setBanqueOuverte((ouverte) => !ouverte);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-[#315864] bg-[#e7f0ef] px-4 py-3 text-xs font-bold text-[#315864]"
              >
                <BookMarked size={15} />
                {banqueOuverte ? "Fermer la banque" : "Banque de questions"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuestionEnEdition(null);
                  setFormulaireQuestion((ouvert) => !ouvert);
                  setImportLot(false);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-[#49bfa9] px-4 py-3 text-xs font-bold text-[#17313a]"
              >
                {formulaireQuestion ? <X size={15} /> : <Plus size={15} />}
                {formulaireQuestion ? "Fermer" : "Ajouter une question"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormulaireQuestion(false);
                  setQuestionEnEdition(null);
                  setImportLot((ouvert) => !ouvert);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-xs font-bold text-ink hover:border-[#49bfa9]"
              >
                {importLot ? <X size={15} /> : <FileUp size={15} />}
                {importLot ? "Fermer" : "Importer en lot"}
              </button>
            </div>
          </div>

          {importLot && (
            <div className="mt-5">
              <ImportLotQuestions
                questionnaireId={questionnaireId}
                onSucces={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["questions-admin", questionnaireId],
                  });

                  setImportLot(false);
                }}
              />
            </div>
          )}

          {banqueOuverte && (
            <section className="mt-5 rounded-xl border border-[#b9ddd5] bg-[#f7faf9] p-5">
              <h3 className="font-display text-xl font-medium text-ink">Banque réutilisable</h3>
              <p className="mt-1 text-xs text-ink/55">Ajoutez une copie d’une question à ce questionnaire. Les questions déjà utilisées dans un quiz ne sont jamais modifiées.</p>
              <div className="mt-4 space-y-2">
                {questionsBanque.map((question) => (
                  <div key={question.id} className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <strong className="block text-sm text-ink">{question.enonce}</strong>
                      <span className="mt-1 block text-[11px] text-ink/55">{question.points} point(s) · {question.reponses.length} réponse(s)</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => ajouterDepuisBanque.mutate(question.id)} disabled={ajouterDepuisBanque.isPending} className="rounded-md bg-[#315864] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Ajouter</button>
                      <button type="button" onClick={() => { if (window.confirm("Supprimer ce modèle de la banque ? Les questions déjà ajoutées aux questionnaires restent intactes.")) supprimerDeLaBanque.mutate(question.id); }} disabled={supprimerDeLaBanque.isPending} className="rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Supprimer</button>
                    </div>
                  </div>
                ))}
                {questionsBanque.length === 0 && <p className="py-3 text-sm text-ink/55">La banque est vide. Enregistrez une question existante ci-dessous.</p>}
              </div>
            </section>
          )}

          {formulaireQuestion && (
            <div className="mt-5">
              <FormulaireQuestion
                key={questionEnEdition ?? "nouvelle-question"}
                questionnaireId={questionnaireId}
                ordre={questions.length + 1}
                question={
                  questions.find(
                    (element) => element.id === questionEnEdition
                  ) ?? null
                }
                peutModifierReponses={tentatives.length === 0}
                onSucces={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["questions-admin", questionnaireId],
                  });

                  setQuestionEnEdition(null);
                  setFormulaireQuestion(false);
                }}
              />
            </div>
          )}

          <div className="mt-6 space-y-3">
            {questions.map((question, index) => (
              <article
                key={question.id}
                className="rounded-xl border border-line bg-white p-5"
              >
                <span className="text-[9px] font-bold tracking-[0.14em] text-[#315864]">
                  QUESTION {index + 1} · {question.points} POINT(S)
                </span>

                <h3 className="mt-3 text-base font-bold text-ink">
                  {question.enonce}
                </h3>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {question.reponses.map((reponse) => (
                    <div
                      key={reponse.id}
                      className={[
                        "rounded-md border px-3 py-2 text-xs",
                        reponse.est_correcte
                          ? "border-[#49bfa9] bg-[#e7f0ef] text-[#315864]"
                          : "border-line text-ink/60",
                      ].join(" ")}
                    >
                      {reponse.est_correcte && (
                        <Check size={13} className="mr-1 inline-block" />
                      )}
                      {reponse.texte}
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
                  <button
                    type="button"
                    disabled={index === 0 || deplacerQuestion.isPending}
                    onClick={() =>
                      deplacerQuestion.mutate({
                        question,
                        direction: "haut",
                      })
                    }
                    className="inline-flex items-center justify-center rounded-md bg-[#e7f0ef] p-2 text-[#315864] transition-colors hover:bg-[#d8f5ef] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Déplacer vers le haut"
                  >
                    <ArrowUp size={14} />
                  </button>

                  <button
                    type="button"
                    disabled={index === questions.length - 1 || deplacerQuestion.isPending}
                    onClick={() =>
                      deplacerQuestion.mutate({
                        question,
                        direction: "bas",
                      })
                    }
                    className="inline-flex items-center justify-center rounded-md bg-[#e7f0ef] p-2 text-[#315864] transition-colors hover:bg-[#d8f5ef] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Déplacer vers le bas"
                  >
                    <ArrowDown size={14} />
                  </button>

                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionEnEdition(question.id);
                        setFormulaireQuestion(true);
                        setImportLot(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-[#e7f0ef] px-3 py-2 text-xs font-bold text-[#315864] hover:bg-[#d8f5ef]"
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => sauvegarderDansBanque.mutate(question.id)}
                      disabled={sauvegarderDansBanque.isPending}
                      className="inline-flex items-center gap-2 rounded-md border border-[#315864] bg-white px-3 py-2 text-xs font-bold text-[#315864] disabled:opacity-50"
                    >
                      <BookMarked size={14} />
                      Ajouter à la banque
                    </button>

                    <button
                      type="button"
                      disabled={supprimerUneQuestion.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Supprimer cette question et toutes ses réponses possibles ?"
                          )
                        ) {
                          setErreurAction(null);
                          supprimerUneQuestion.mutate(question.id);
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {questions.length === 0 && (
              <EmptyState
                icon={<ClipboardList size={22} />}
                titre="Aucune question"
                message="Ajoutez la première question à ce questionnaire."
              />
            )}
          </div>

          <section className="mt-8 rounded-xl border border-line bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f0ef] text-[#315864]">
                <BarChart3 size={20} />
              </div>

              <div>
                <h2 className="font-display text-2xl font-medium text-ink">
                  Résultats et tentatives
                </h2>

                <p className="text-xs text-ink/55">
                  Historique des passages du questionnaire sélectionné.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[#e7f0ef] p-4">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#315864]">
                  TENTATIVES TERMINÉES
                </p>
                <p className="mt-2 font-display text-3xl font-medium text-ink">
                  {tentativesTerminees.length}
                </p>
              </div>

              <div className="rounded-lg bg-[#d8f5ef] p-4">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#21665a]">
                  TAUX DE RÉUSSITE
                </p>
                <p className="mt-2 font-display text-3xl font-medium text-[#21665a]">
                  {tauxReussite}%
                </p>
              </div>

              <div className="rounded-lg bg-[#315864] p-4 text-white">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#49bfa9]">
                  SCORE MOYEN
                </p>
                <p className="mt-2 font-display text-3xl font-medium">
                  {scoreMoyen}%
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">
                  <tr>
                    <th className="px-3 py-3">Collaborateur</th>
                    <th className="px-3 py-3">Score</th>
                    <th className="px-3 py-3">Résultat</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {tentatives.map((tentative) => (
                    <tr
                      key={tentative.id}
                      className="border-b border-line/70"
                    >
                      <td className="px-3 py-4">
                        <p className="font-bold text-ink">
                          {tentative.utilisateur_prenom} {tentative.utilisateur_nom}
                        </p>
                        <p className="mt-1 text-[10px] text-ink/45">
                          Tentative #{tentative.numero_tentative}
                        </p>
                      </td>

                      <td className="px-3 py-4 text-ink/70">
                        {tentative.score !== null
                          ? `${tentative.score}%`
                          : "En cours"}
                      </td>

                      <td className="px-3 py-4">
                        {tentative.reussi ? (
                          <span className="rounded-full bg-[#d8f5ef] px-3 py-1.5 text-xs font-bold text-[#21665a]">
                            Réussi
                          </span>
                        ) : tentative.statut === "en_cours" ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                            En cours
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                            Non validé
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4 text-xs text-ink/55">
                        {tentative.date_passage
                          ? new Date(
                              tentative.date_passage
                            ).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {tentatives.length === 0 && (
                <p className="py-6 text-sm text-ink/55">
                  Aucune tentative enregistrée pour ce questionnaire.
                </p>
              )}
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

function FormulaireQuestionnaire({
  formationId,
  questionnaire,
  onSucces,
}: {
  formationId: string;
  questionnaire: {
    id: string;
    titre: string;
    score_minimum_reussite: number;
    nombre_tentatives_max: number | null;
    temps_limite_secondes: number | null;
  } | null;
  onSucces: () => void;
}) {
  const toast = useToast();
  const estEnEdition = Boolean(questionnaire);

  const [titre, setTitre] = useState(questionnaire?.titre ?? "");
  const [score, setScore] = useState(
    String(questionnaire?.score_minimum_reussite ?? 70)
  );
  const [tentatives, setTentatives] = useState(
    questionnaire?.nombre_tentatives_max?.toString() ?? ""
  );
  const [tempsMinutes, setTempsMinutes] = useState(
    questionnaire?.temps_limite_secondes
      ? String(Math.floor(questionnaire.temps_limite_secondes / 60))
      : ""
  );
  const [tempsSecondes, setTempsSecondes] = useState(
    questionnaire?.temps_limite_secondes
      ? String(questionnaire.temps_limite_secondes % 60)
      : ""
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = useMutation({
    mutationFn: () => {
      const tempsLimiteSecondes = Number(tempsMinutes || 0) * 60 + Number(tempsSecondes || 0);
      if (estEnEdition && questionnaire) {
        return modifierQuestionnaire(formationId, questionnaire.id, {
          titre,
          score_minimum_reussite: Number(score),
          nombre_tentatives_max: tentatives
            ? Number(tentatives)
            : undefined,
          temps_limite_secondes: tempsLimiteSecondes || undefined,
        });
      }

      return creerQuestionnaire(formationId, {
        titre,
        score_minimum_reussite: Number(score),
        nombre_tentatives_max: tentatives
          ? Number(tentatives)
          : undefined,
        temps_limite_secondes: tempsLimiteSecondes || undefined,
      });
    },

    onSuccess: () => {
      toast.succes(
        estEnEdition
          ? "Questionnaire modifié avec succès."
          : "Questionnaire créé avec succès.",
      );
      onSucces();
    },

    onError: (error) => {
      setErreur(
        error instanceof Error
          ? error.message
          : estEnEdition
            ? "Impossible de modifier le questionnaire."
            : "Impossible de créer le questionnaire."
      );
    },
  });

  return (
    <form
      className="rounded-xl border border-line bg-white p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setErreur(null);
        enregistrer.mutate();
      }}
    >
      <h3 className="font-display text-xl font-medium text-ink">
        {estEnEdition ? "Modifier le questionnaire" : "Nouveau questionnaire"}
      </h3>

      {erreur && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-bold text-ink">
          Titre

          <input
            required
            value={titre}
            onChange={(event) => setTitre(event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <label className="grid gap-2 text-xs font-bold text-ink">
          Score minimum (%)

          <input
            required
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <label className="grid gap-2 text-xs font-bold text-ink">
          Nombre maximum de tentatives

          <input
            type="number"
            min="1"
            value={tentatives}
            onChange={(event) => setTentatives(event.target.value)}
            placeholder="Illimité si vide"
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <div className="grid gap-2 text-xs font-bold text-ink">
          <span>Temps limite (facultatif)</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 font-normal text-ink/60">
              Minutes
              <input
                type="number"
                min="0"
                step="1"
                value={tempsMinutes}
                onChange={(event) => setTempsMinutes(event.target.value)}
                placeholder="Exemple : 5"
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
                value={tempsSecondes}
                onChange={(event) => setTempsSecondes(event.target.value)}
                placeholder="Exemple : 30"
                className="rounded-md border border-line px-4 py-3 text-sm text-ink outline-none focus:border-[#49bfa9]"
              />
            </label>
          </div>
          <p className="text-[11px] font-normal leading-relaxed text-ink/55">
            Laissez les deux champs vides pour un quiz sans limite. Par exemple,
            5 minutes est enregistré comme 300 secondes et affiché au collaborateur
            au démarrage du quiz.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={enregistrer.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#315864] px-5 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check size={15} />
        {enregistrer.isPending
          ? estEnEdition
            ? "Modification…"
            : "Création…"
          : estEnEdition
            ? "Enregistrer les modifications"
            : "Créer le questionnaire"}
      </button>
    </form>
  );
}

function FormulaireQuestion({
  questionnaireId,
  ordre,
  question,
  peutModifierReponses,
  onSucces,
}: {
  questionnaireId: string;
  ordre: number;
  question: QuestionAdmin | null;
  peutModifierReponses: boolean;
  onSucces: () => void;
}) {
  const toast = useToast();
  const estEnEdition = Boolean(question);

  const [enonce, setEnonce] = useState(question?.enonce ?? "");
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [ordreQuestion, setOrdreQuestion] = useState(
    String(question?.ordre ?? ordre)
  );

  const [reponses, setReponses] = useState(
    question?.reponses.map((reponse) => reponse.texte) ?? ["", ""]
  );

  const [bonneReponse, setBonneReponse] = useState(
    question?.reponses.findIndex((reponse) => reponse.est_correcte) ?? 0
  );

  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = useMutation({
    mutationFn: async () => {
      if (estEnEdition && question) {
        await modifierQuestion(questionnaireId, question.id, {
          enonce,
          points: Number(points),
          ordre: Number(ordreQuestion),
        });

        if (peutModifierReponses) {
          await modifierReponsesQuestion(
            questionnaireId,
            question.id,
            reponses.map((texte, index) => ({
              texte,
              est_correcte: index === bonneReponse,
              ordre: index + 1,
            }))
          );
        }

        return;
      }

      await creerQuestion(questionnaireId, {
        enonce,
        points: Number(points),
        ordre: Number(ordreQuestion),
        reponses: reponses.map((texte, index) => ({
          texte,
          est_correcte: index === bonneReponse,
          ordre: index + 1,
        })),
      });
    },

    onSuccess: () => {
      toast.succes(
        estEnEdition
          ? "Question modifiée avec succès."
          : "Question ajoutée avec succès.",
      );
      onSucces();
    },

    onError: (error) => {
      setErreur(
        error instanceof Error
          ? error.message
          : estEnEdition
            ? "Impossible de modifier la question."
            : "Impossible d’ajouter la question."
      );
    },
  });

  function modifierReponse(index: number, valeur: string) {
    setReponses((actuelles) =>
      actuelles.map((reponse, position) =>
        position === index ? valeur : reponse
      )
    );
  }

  function ajouterReponse() {
    setReponses((actuelles) => [...actuelles, ""]);
  }

  function supprimerReponse(index: number) {
    if (reponses.length <= 2) return;

    setReponses((actuelles) =>
      actuelles.filter((_, position) => position !== index)
    );

    if (bonneReponse === index) {
      setBonneReponse(0);
    } else if (bonneReponse > index) {
      setBonneReponse((actuel) => actuel - 1);
    }
  }

  return (
    <form
      className="rounded-xl border border-line bg-white p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setErreur(null);
        enregistrer.mutate();
      }}
    >
      <h3 className="font-display text-xl font-medium text-ink">
        {estEnEdition ? "Modifier la question" : "Ajouter une question"}
      </h3>

      {estEnEdition && !peutModifierReponses && (
        <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Des tentatives existent déjà pour ce questionnaire. L’énoncé, le
          nombre de points et l’ordre peuvent être modifiés, mais les réponses
          possibles ne peuvent plus être modifiées.
        </p>
      )}

      {erreur && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-xs font-bold text-ink">
          Énoncé

          <textarea
            required
            value={enonce}
            onChange={(event) => setEnonce(event.target.value)}
            rows={3}
            className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-ink">
            Nombre de points

            <input
              required
              type="number"
              min="1"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>

          <label className="grid gap-2 text-xs font-bold text-ink">
            Ordre

            <input
              required
              type="number"
              min="1"
              value={ordreQuestion}
              onChange={(event) => setOrdreQuestion(event.target.value)}
              className="rounded-md border border-line px-4 py-3 text-sm font-normal outline-none focus:border-[#49bfa9]"
            />
          </label>
        </div>

        {(!estEnEdition || peutModifierReponses) && (
          <div>
            <span className="text-xs font-bold text-ink">
              Réponses possibles — choisissez la bonne réponse.
            </span>

            <div className="mt-3 grid gap-3">
              {reponses.map((reponse, index) => (
                <div
                  key={index}
                  className={[
                    "flex items-center gap-3 rounded-md border p-3",
                    bonneReponse === index
                      ? "border-[#49bfa9] bg-[#e7f0ef]"
                      : "border-line",
                  ].join(" ")}
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="bonne-reponse"
                      checked={bonneReponse === index}
                      onChange={() => setBonneReponse(index)}
                      className="accent-[#315864]"
                    />
                  </label>

                  <input
                    required
                    value={reponse}
                    onChange={(event) =>
                      modifierReponse(index, event.target.value)
                    }
                    placeholder={`Réponse ${index + 1}`}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />

                  {reponses.length > 2 && (
                    <button
                      type="button"
                      onClick={() => supprimerReponse(index)}
                      className="shrink-0 text-ink/30 transition-colors hover:text-rust"
                      aria-label="Supprimer cette réponse"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={ajouterReponse}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-xs font-bold text-ink/55 transition-colors hover:border-[#49bfa9] hover:text-[#315864]"
            >
              <Plus size={14} />
              Ajouter une réponse
            </button>
          </div>
        )}

        {estEnEdition && !peutModifierReponses && (
          <div>
            <span className="text-xs font-bold text-ink">
              Réponses actuelles
            </span>

            <div className="mt-3 grid gap-2">
              {question?.reponses.map((reponse) => (
                <div
                  key={reponse.id}
                  className={[
                    "rounded-md border px-3 py-2 text-xs",
                    reponse.est_correcte
                      ? "border-[#49bfa9] bg-[#e7f0ef] text-[#315864]"
                      : "border-line text-ink/60",
                  ].join(" ")}
                >
                  {reponse.est_correcte && (
                    <Check size={13} className="mr-1 inline-block" />
                  )}
                  {reponse.texte}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={enregistrer.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check size={15} />
        {enregistrer.isPending
          ? estEnEdition
            ? "Modification…"
            : "Ajout…"
          : estEnEdition
            ? "Enregistrer les modifications"
            : "Ajouter la question"}
      </button>
    </form>
  );
}

function ImportLotQuestions({
  questionnaireId,
  onSucces,
}: {
  questionnaireId: string;
  onSucces: () => void;
}) {
  const toast = useToast();
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const enregistrer = useMutation({
    mutationFn: async () => {
      const questions = analyserTexte(texte);
      await creerQuestionsLot(questionnaireId, questions);
    },
    onSuccess: (_data) => {
      toast.succes("Questions importées avec succès.");
      setTexte("");
      setErreur(null);
      onSucces();
    },
    onError: (error) => {
      setErreur(
        error instanceof Error
          ? error.message
          : "Impossible d'importer les questions.",
      );
    },
  });

  return (
    <form
      className="rounded-xl border border-line bg-white p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setErreur(null);
        enregistrer.mutate();
      }}
    >
      <h3 className="font-display text-xl font-medium text-ink">
        Importer des questions en lot
      </h3>

      <p className="mt-2 text-xs leading-relaxed text-ink/55">
        Collez vos questions au format suivant. Chaque question est séparée
        par une ligne vide. La ligne commençant par <code className="rounded bg-ink/5 px-1 font-mono">*</code>{" "}
        indique la bonne réponse. Un JSON valide est également accepté.
      </p>

      <pre className="mt-3 overflow-x-auto rounded-lg bg-ink/5 p-3 font-mono text-[11px] leading-relaxed text-ink/65">
{`Q: Quel est le protocole sécurisé pour les mots de passe ?
* Utiliser un gestionnaire de mots de passe
- Noter les mots de passe dans un fichier
- Utiliser le même mot de passe partout
- Les partager par email

Q: Que faire face à un email suspect ?
* Ne pas cliquer et signaler au support
- Cliquer pour vérifier
- Répondre pour demander des précisions
- Transférer à un collègue`}
      </pre>

      {erreur && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <label className="mt-5 grid gap-2 text-xs font-bold text-ink">
        Contenu à importer

        <textarea
          required
          value={texte}
          onChange={(event) => setTexte(event.target.value)}
          rows={10}
          placeholder="Q: Votre question ?&#10;* Bonne réponse&#10;- Mauvaise réponse&#10;- Mauvaise réponse"
          className="rounded-md border border-line px-4 py-3 font-mono text-sm font-normal outline-none focus:border-[#49bfa9]"
        />
      </label>

      <button
        type="submit"
        disabled={enregistrer.isPending}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#315864] px-5 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileUp size={15} />
        {enregistrer.isPending ? "Import…" : "Importer les questions"}
      </button>
    </form>
  );
}

function analyserTexte(texte: string) {
  const texteNettoye = texte
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Le format lisible Q: / * / - est le format principal. Le JSON structuré
  // reste accepté pour récupérer d'éventuelles générations antérieures.
  if (texteNettoye.startsWith("[")) {
    try {
      return analyserQuizJson(JSON.parse(texteNettoye) as unknown);
    } catch (cause) {
      if (cause instanceof Error) throw cause;
      throw new Error("Le JSON des questions est invalide.");
    }
  }

  const blocs = texteNettoye
    .split(/\n\s*\n/)
    .map((bloc) => bloc.trim())
    .filter(Boolean);

  const questions: {
    enonce: string;
    points: number;
    ordre: number;
    reponses: { texte: string; est_correcte: boolean; ordre: number }[];
  }[] = [];

  for (let i = 0; i < blocs.length; i++) {
    const lignes = blocs[i]
      .split("\n")
      .map((ligne) => ligne.trim())
      .filter(Boolean);

    const ligneQuestion = lignes.find((ligne) =>
      /^(Q[:?]|Question[:?])/i.test(ligne),
    );

    if (!ligneQuestion) {
      throw new Error(
        `Bloc ${i + 1}: aucune question trouvée (utilisez "Q: votre question").`,
      );
    }

    const enonce = ligneQuestion.replace(/^Q[:?]?\s*/i, "").trim();
    if (!enonce) {
      throw new Error(`Bloc ${i + 1}: énoncé de question vide.`);
    }

    const lignesReponses = lignes.filter(
      (ligne) => ligne !== ligneQuestion,
    );

    if (lignesReponses.length < 2) {
      throw new Error(
        `Bloc ${i + 1}: au moins 2 réponses sont requises.`,
      );
    }

    const aUneCorrecte = lignesReponses.some((ligne) =>
      ligne.startsWith("*"),
    );
    if (!aUneCorrecte) {
      throw new Error(
        `Bloc ${i + 1}: marquez la bonne réponse avec "*".`,
      );
    }

    const reponses = lignesReponses.map((ligne, index) => {
      const estCorrecte = ligne.startsWith("*");
      const texteReponse = ligne.replace(/^[*-]\s*/, "").trim();
      return {
        texte: texteReponse,
        est_correcte: estCorrecte,
        ordre: index + 1,
      };
    });

    const nombreCorrectes = reponses.filter((r) => r.est_correcte).length;
    if (nombreCorrectes !== 1) {
      throw new Error(
        `Bloc ${i + 1}: une seule réponse doit être marquée comme correcte (trouvé: ${nombreCorrectes}).`,
      );
    }

    questions.push({
      enonce,
      points: 1,
      ordre: questions.length + 1,
      reponses,
    });
  }

  if (questions.length === 0) {
    throw new Error("Aucune question valide trouvée dans le texte.");
  }

  return questions;
}

function analyserQuizJson(donnees: unknown) {
  if (!Array.isArray(donnees)) {
    throw new Error("Le JSON doit contenir une liste de questions.");
  }

  if (donnees.length === 0) {
    throw new Error("Aucune question valide trouvée dans le JSON.");
  }

  return donnees.map((element, index) => {
    if (!element || typeof element !== "object") {
      throw new Error(`Question ${index + 1}: format invalide.`);
    }

    const question = element as Record<string, unknown>;
    const enonce = typeof question.enonce === "string" ? question.enonce.trim() : "";
    const reponsesBrutes = question.reponses;

    if (!enonce) {
      throw new Error(`Question ${index + 1}: énoncé manquant.`);
    }

    if (!Array.isArray(reponsesBrutes) || reponsesBrutes.length < 2) {
      throw new Error(`Question ${index + 1}: au moins 2 réponses sont requises.`);
    }

    const reponses = reponsesBrutes.map((elementReponse, indexReponse) => {
      if (!elementReponse || typeof elementReponse !== "object") {
        throw new Error(`Question ${index + 1}: réponse ${indexReponse + 1} invalide.`);
      }

      const reponse = elementReponse as Record<string, unknown>;
      const texteReponse = typeof reponse.texte === "string" ? reponse.texte.trim() : "";
      if (!texteReponse || typeof reponse.est_correcte !== "boolean") {
        throw new Error(
          `Question ${index + 1}: chaque réponse doit contenir « texte » et « est_correcte »`,
        );
      }

      return {
        texte: texteReponse,
        est_correcte: reponse.est_correcte,
        ordre: indexReponse + 1,
      };
    });

    const nombreCorrectes = reponses.filter((reponse) => reponse.est_correcte).length;
    if (nombreCorrectes !== 1) {
      throw new Error(
        `Question ${index + 1}: une seule réponse doit être correcte (trouvé: ${nombreCorrectes}).`,
      );
    }

    return {
      enonce,
      points:
        typeof question.points === "number" &&
        Number.isInteger(question.points) &&
        question.points > 0
          ? question.points
          : 1,
      ordre: index + 1,
      reponses,
    };
  });
}
