import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Trophy,
} from "lucide-react";
import {
  demarrerTentative,
  soumettreTentative,
} from "../../api/tentatives";
import { listerQuestionsQuiz } from "../../api/questionnaires";
import { LoadingState } from "../../components/ui/Primitives";
import { formaterDureeQuestionnaire } from "../../lib/duree";
import { API_BASE_URL } from "../../api/client";

function formaterTemps(secondes: number) {
  return formaterDureeQuestionnaire(secondes);
}

/**
 * Les premières tentatives enregistrées par l'API utilisaient des dates UTC
 * sans suffixe. JavaScript les interprète alors comme des dates locales, ce
 * qui enlève deux heures en France et peut faire expirer un quiz immédiatement.
 * Les dates déjà accompagnées d'un fuseau sont conservées telles quelles.
 */
function lireDateServeurEnUtc(valeur: string): number {
  const possedeFuseau = /(?:Z|[+-]\d{2}:\d{2})$/i.test(valeur);
  return new Date(possedeFuseau ? valeur : `${valeur}Z`).getTime();
}

export function PasserQuiz() {
  const { formationId, questionnaireId } = useParams<{
    formationId: string;
    questionnaireId: string;
  }>();

  const [demarre, setDemarre] = useState(false);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [tempsRestant, setTempsRestant] = useState<number | null>(null);
  const [expirationSoumise, setExpirationSoumise] = useState(false);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["questions-quiz", questionnaireId],
    queryFn: () => listerQuestionsQuiz(questionnaireId!),
    enabled: Boolean(questionnaireId),
  });

  const demarrer = useMutation({
    mutationFn: () => demarrerTentative(questionnaireId!),
    onSuccess: (tentative) => {
      setDemarre(true);
      setExpirationSoumise(false);

      if (tentative.temps_limite_secondes !== null) {
        const dateDebut = lireDateServeurEnUtc(tentative.date_debut);
        const secondesEcoulees = Math.floor((Date.now() - dateDebut) / 1000);

        setTempsRestant(
          Math.max(0, tentative.temps_limite_secondes - secondesEcoulees)
        );
      }
    },
  });

  const soumettre = useMutation({
    mutationFn: (expirationAutomatique: boolean) =>
      soumettreTentative(
        demarrer.data!.tentative_id,
        Object.entries(reponses).map(([question_id, reponse_possible_id]) => ({
          question_id,
          reponse_possible_id,
        })),
        expirationAutomatique,
      ),
  });

  useEffect(() => {
    if (!demarre || tempsRestant === null || tempsRestant <= 0) return;

    const intervalle = window.setInterval(() => {
      setTempsRestant((temps) => (temps === null ? null : Math.max(0, temps - 1)));
    }, 1000);

    return () => window.clearInterval(intervalle);
  }, [demarre, tempsRestant]);

  // Le serveur reste la source de vérité pour l'heure de départ. Une fois le
  // compteur arrivé à zéro, la tentative est envoyée même si elle est partielle
  // afin d'enregistrer clairement l'échec pour dépassement de délai.
  useEffect(() => {
    if (
      !demarre ||
      tempsRestant !== 0 ||
      expirationSoumise ||
      soumettre.isPending ||
      soumettre.data
    ) {
      return undefined;
    }

    const delai = window.setTimeout(() => {
      setExpirationSoumise(true);
      soumettre.mutate(true);
    }, 1200);

    return () => window.clearTimeout(delai);
  }, [demarre, tempsRestant, expirationSoumise, soumettre]);

  const reponsesCompletes = useMemo(
    () => questions.length > 0 && Object.keys(reponses).length === questions.length,
    [questions.length, reponses]
  );

  if (isLoading) {
    return <LoadingState message="Chargement du quiz…" />;
  }

  if (soumettre.data) {
    const resultat = soumettre.data;

    return (
      <div className="mx-auto max-w-2xl">
        <section className="overflow-hidden rounded-xl bg-[#315864] p-8 text-center text-white md:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#49bfa9] text-[#17313a]">
            <Trophy size={30} />
          </div>

          <span className="mt-6 block text-[10px] font-bold tracking-[0.16em] text-[#49bfa9]">
            RÉSULTAT DU QUIZ
          </span>

          <h1 className="mt-4 font-display text-5xl font-medium tracking-[-0.06em]">
            {resultat.score ?? 0}%
          </h1>

          <p className="mt-4 text-sm text-white/80">
            {resultat.reussi
              ? "Félicitations, votre évaluation est validée."
              : resultat.hors_delai
                ? "Le temps imparti est dépassé. Cette tentative est considérée comme non validée."
                : "Cette tentative n’est pas validée. Vous pourrez recommencer selon les règles du questionnaire."}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {resultat.certificat_id && (
              <a
                href={`${API_BASE_URL}/api/certificats/${resultat.certificat_id}/public/pdf/apercu`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a]"
              >
                Voir mon certificat
              </a>
            )}

            <Link
              to={`/espace/formations/${formationId}`}
              className="rounded-md border border-white/25 px-5 py-3 text-xs font-bold text-white"
            >
              Retour à la formation
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!demarre) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          to={`/espace/formations/${formationId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-[#315864]"
        >
          <ArrowLeft size={15} />
          Retour à la formation
        </Link>

        <section className="mt-5 overflow-hidden rounded-xl bg-[#315864] p-8 text-white md:p-12">
          <span className="text-[10px] font-bold tracking-[0.16em] text-[#49bfa9]">
            QUIZ DE VALIDATION
          </span>

          <h1 className="mt-5 font-display text-4xl font-medium tracking-[-0.06em] md:text-6xl">
            Testez vos connaissances.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/75">
            Le minuteur est déclenché au moment où vous commencez. Assurez-vous
            d’être disponible avant de lancer le quiz.
          </p>

          <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-4 text-sm">
            {questions.length} question(s) devront recevoir une réponse.
          </div>

          {demarrer.isError && (
            <p className="mt-5 rounded-lg bg-red-500/20 p-4 text-sm text-red-100">
              {demarrer.error instanceof Error
                ? demarrer.error.message
                : "Impossible de démarrer le quiz. Vérifiez votre progression et le nombre de tentatives disponibles."}
            </p>
          )}

          <button
            type="button"
            onClick={() => demarrer.mutate()}
            disabled={demarrer.isPending || questions.length === 0}
            className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#49bfa9] px-5 py-3 text-xs font-bold text-[#17313a] disabled:opacity-50"
          >
            {demarrer.isPending ? "Démarrage…" : "Commencer le quiz"}
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/espace/formations/${formationId}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-[#315864]"
      >
        <ArrowLeft size={15} />
        Quitter le quiz
      </Link>

      <header className="mt-6 flex items-end justify-between gap-5">
        <div>
          <span className="section-kicker">
            <i /> QUIZ DE VALIDATION
          </span>

          <h1 className="mt-4 font-display text-4xl font-medium tracking-[-0.06em] text-ink md:text-5xl">
            Testez vos connaissances.
          </h1>
        </div>

        {tempsRestant !== null && (
          <span
            className={[
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
              tempsRestant < 60
                ? "bg-red-100 text-red-700"
                : "bg-[#e7f0ef] text-[#315864]",
            ].join(" ")}
          >
            <Clock3 size={16} />
            {formaterTemps(tempsRestant)}
          </span>
        )}
      </header>

      <div className="mt-8 space-y-5">
        {questions.map((question, index) => (
          <article
            key={question.id}
            className="rounded-xl border border-line bg-white p-6 md:p-8"
          >
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#315864]">
              QUESTION {index + 1} SUR {questions.length}
            </span>

            <h2 className="mt-4 text-xl font-bold tracking-[-0.03em] text-ink">
              {question.enonce}
            </h2>

            <div className="mt-6 space-y-2">
              {question.reponses.map((reponse, reponseIndex) => {
                const selectionnee = reponses[question.id] === reponse.id;

                return (
                  <button
                    key={reponse.id}
                    type="button"
                    onClick={() =>
                      setReponses((actuelles) => ({
                        ...actuelles,
                        [question.id]: reponse.id,
                      }))
                    }
                    className={[
                      "flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition",
                      selectionnee
                        ? "border-[#315864] bg-[#e7f0ef] text-[#17313a]"
                        : "border-line bg-[#f7faf9] text-ink hover:border-[#49bfa9]",
                    ].join(" ")}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#315864]">
                      {String.fromCharCode(65 + reponseIndex)}
                    </span>

                    <span className="flex-1">{reponse.texte}</span>

                    {selectionnee && <Check size={18} className="text-[#315864]" />}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      {soumettre.isError && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {soumettre.error instanceof Error
            ? soumettre.error.message
            : "Impossible d’envoyer le quiz. Vérifiez votre connexion puis réessayez."}
        </p>
      )}

      <footer className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
        <span className="text-xs text-ink/55">
          {tempsRestant === 0
            ? soumettre.isError
              ? "Temps écoulé : la tentative doit encore être envoyée."
              : "Temps écoulé : soumission automatique en cours…"
            : `${Object.keys(reponses).length} réponse(s) sélectionnée(s) sur ${questions.length}`}
        </span>

        <button
          type="button"
          disabled={
            soumettre.isPending ||
            (tempsRestant !== 0 && !reponsesCompletes)
          }
          onClick={() => soumettre.mutate(tempsRestant === 0)}
          className="inline-flex items-center gap-2 rounded-md bg-[#315864] px-5 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {soumettre.isPending
            ? "Envoi…"
            : tempsRestant === 0
              ? "Réessayer l’envoi"
              : "Valider mes réponses"}
          <ArrowRight size={15} />
        </button>
      </footer>
    </div>
  );
}
