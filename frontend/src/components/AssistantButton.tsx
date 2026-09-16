import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  ClipboardCopy,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  genererAssistant,
  poserQuestionAssistant,
} from "../api/assistant";
import { listerContenus } from "../api/contenus";
import { listerFormations } from "../api/formations";
import { mesProgressions } from "../api/affectations";
import type { ModeGeneration, QuestionCreatePropose } from "../api/types";
import { cn } from "../lib/utils";

const MODES: { valeur: ModeGeneration; libelle: string }[] = [
  { valeur: "resume", libelle: "Résumé" },
  { valeur: "points_cles", libelle: "Points clés" },
  { valeur: "explication_simple", libelle: "Simplifier" },
  { valeur: "quiz", libelle: "Quiz de révision" },
  { valeur: "questions_revision", libelle: "Questions" },
];

interface AssistantButtonProps {
  variant: "admin" | "collaborateur";
  mode?: "header" | "sidebar";
  darkSidebar?: boolean;
}

export function AssistantButton({ variant, mode = "header", darkSidebar = false }: AssistantButtonProps) {
  const queryClient = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState<"question" | "generation">("question");

  const [formationQuestion, setFormationQuestion] = useState("");
  const [formationGeneration, setFormationGeneration] = useState("");
  const [contenuId, setContenuId] = useState("");
  const [question, setQuestion] = useState("");
  const [modeGen, setModeGen] = useState<ModeGeneration>("resume");
  const [quizCopie, setQuizCopie] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const couleurIcone =
    variant === "admin"
      ? "text-white/65 hover:text-white"
      : "text-ink/50 hover:text-ink";

  const estSidebar = mode === "sidebar";

  const { data: formations = [] } = useQuery({
    queryKey: variant === "admin" ? ["formations"] : ["formations", "assistant-collab"],
    queryFn: () => listerFormations(),
  });

  const { data: progressions = [] } = useQuery({
    queryKey: ["mes-progressions"],
    queryFn: mesProgressions,
    enabled: variant === "collaborateur" && ouvert,
  });

  const formationsDisponibles =
    variant === "admin"
      ? formations.filter((formation) => formation.actif)
      : formations.filter(
          (formation) =>
            formation.actif &&
            progressions.some((p) => p.formation_id === formation.id),
        );

  const formationQuestionChoisie = formationsDisponibles.find(
    (f) => f.id === formationQuestion,
  );
  const formationGenerationChoisie = formationsDisponibles.find(
    (f) => f.id === formationGeneration,
  );

  const { data: contenus = [] } = useQuery({
    queryKey: ["contenus", formationGeneration],
    queryFn: () => listerContenus(formationGeneration),
    enabled:
      Boolean(formationGeneration) && onglet === "generation" && ouvert,
  });

  const contenusIndexes = contenus.filter(
    (contenu) => contenu.statut_ingestion === "terminee",
  );

  useEffect(() => {
    if (!ouvert) return;

    function handleClickExterieur(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOuvert(false);
      }
    }

    document.addEventListener("mousedown", handleClickExterieur);
    return () => document.removeEventListener("mousedown", handleClickExterieur);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) {
      setOnglet("question");
      setQuestion("");
      setContenuId("");
    }
  }, [ouvert]);

  useEffect(() => {
    setContenuId("");
  }, [formationGeneration]);

  const poserQuestionMutation = useMutation({
    mutationFn: () =>
      poserQuestionAssistant(formationQuestion, question.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-non-lues"] });
    },
  });

  const genererMutation = useMutation({
    mutationFn: () => genererAssistant(contenuId, modeGen),
  });

  const peutPoser =
    Boolean(formationQuestion) && question.trim().length > 0;
  const peutGenerer = Boolean(contenuId);

  async function copierQuizPourImport(quiz: QuestionCreatePropose[]) {
    const texte = formaterQuizPourImport(quiz);

    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      // Solution de repli pour les navigateurs qui refusent l'API Clipboard
      // lorsqu'elle est servie depuis une origine locale non sécurisée.
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      document.execCommand("copy");
      document.body.removeChild(zone);
    }

    setQuizCopie(true);
    window.setTimeout(() => setQuizCopie(false), 2500);
  }

  return (
    <div className={estSidebar ? "block w-full" : "relative"} ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((etat) => !etat)}
        className={cn(
          estSidebar
            ? [
                "flex w-full items-center gap-3 rounded-md px-[10px] py-3 text-[12px] font-medium transition-colors",
                variant === "admin" || darkSidebar
                  ? "text-white/65 hover:bg-white/10 hover:text-white"
                  : "text-ink/55 hover:bg-[#f1f6f5] hover:text-[#315864]",
              ]
            : ["relative transition-colors", couleurIcone],
        )}
        aria-label="Assistant IA"
        aria-expanded={ouvert}
      >
        <Bot size={estSidebar ? 17 : 18} />
        {estSidebar && <span>Assistant IA</span>}
      </button>

      {ouvert && (
        <div
          className={cn(
            "absolute z-50 w-[420px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-line bg-white shadow-xl animate-[dropdown-in_0.15s_ease-out]",
            estSidebar
              ? "left-full top-0 ml-2"
              : "right-0 top-full mt-2",
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-[#315864] text-white">
                <Bot size={14} />
              </div>
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-ink/55">
                ASSISTANT IA
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="text-ink/40 transition-colors hover:text-ink"
              aria-label="Fermer"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex border-b border-line bg-paper">
            <Onglet
              actif={onglet === "question"}
              onClick={() => setOnglet("question")}
              icone={<MessageSquareText size={14} />}
              libelle="Poser une question"
            />
            <Onglet
              actif={onglet === "generation"}
              onClick={() => setOnglet("generation")}
              icone={<Sparkles size={14} />}
              libelle="Générer"
            />
          </div>

          {formationsDisponibles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bot size={26} className="text-ink/20" />
              <p className="text-xs text-ink/50">
                {variant === "collaborateur"
                  ? "Aucune formation ne vous a encore été affectée."
                  : "Aucune formation active disponible."}
              </p>
            </div>
          ) : onglet === "question" ? (
            <div className="p-4">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/55">
                  Formation
                </span>
                <select
                  value={formationQuestion}
                  onChange={(event) => setFormationQuestion(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm text-[#17262A] outline-none focus:border-[#49bfa9]"
                >
                  <option value="">Choisir une formation</option>
                  {formationsDisponibles.map((formation) => (
                    <option key={formation.id} value={formation.id} className="bg-white text-[#17262A]">
                      {formation.titre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/55">
                  Question
                </span>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={
                    formationQuestionChoisie
                      ? `Posez une question sur « ${formationQuestionChoisie.titre} »…`
                      : "Choisissez d'abord une formation"
                  }
                  rows={3}
                  disabled={!formationQuestion}
                  className="resize-none rounded-md border border-line bg-white px-3 py-2 text-sm text-[#17262A] placeholder:text-[#607479] outline-none focus:border-[#49bfa9] disabled:bg-paper disabled:text-ink/35"
                />
              </label>

              <button
                type="button"
                onClick={() => poserQuestionMutation.mutate()}
                disabled={!peutPoser || poserQuestionMutation.isPending}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#315864] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1f3e47] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {poserQuestionMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Envoyer
              </button>

              {poserQuestionMutation.isError && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {poserQuestionMutation.error instanceof Error
                    ? poserQuestionMutation.error.message
                    : "L'assistant ne peut pas répondre pour le moment."}
                </p>
              )}

              {poserQuestionMutation.data && (
                <div className="mt-3 rounded-lg bg-[#e7f0ef] p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#17313a]">
                    {poserQuestionMutation.data.reponse}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/55">
                  Formation
                </span>
                <select
                  value={formationGeneration}
                  onChange={(event) =>
                    setFormationGeneration(event.target.value)
                  }
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm text-[#17262A] outline-none focus:border-[#49bfa9]"
                >
                  <option value="">Choisir une formation</option>
                  {formationsDisponibles.map((formation) => (
                    <option key={formation.id} value={formation.id} className="bg-white text-[#17262A]">
                      {formation.titre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/55">
                  Contenu indexé
                </span>
                <select
                  value={contenuId}
                  onChange={(event) => setContenuId(event.target.value)}
                  disabled={!formationGeneration}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm text-[#17262A] outline-none focus:border-[#49bfa9] disabled:bg-paper disabled:text-ink/35"
                >
                  <option value="">
                    {formationGeneration
                      ? contenusIndexes.length === 0
                        ? "Aucun contenu indexé"
                        : "Choisir un contenu"
                      : "Choisissez d'abord une formation"}
                  </option>
                  {contenusIndexes.map((contenu) => (
                    <option key={contenu.id} value={contenu.id} className="bg-white text-[#17262A]">
                      {contenu.titre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/55">
                  Mode
                </span>
                <select
                  value={modeGen}
                  onChange={(event) =>
                    setModeGen(event.target.value as ModeGeneration)
                  }
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm text-[#17262A] outline-none focus:border-[#49bfa9]"
                >
                  {MODES.map((element) => (
                    <option key={element.valeur} value={element.valeur} className="bg-white text-[#17262A]">
                      {element.libelle}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => genererMutation.mutate()}
                disabled={!peutGenerer || genererMutation.isPending}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#49bfa9] px-4 py-2.5 text-xs font-bold text-[#17313a] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {genererMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {genererMutation.isPending ? "Génération…" : "Générer"}
              </button>

              {formationGenerationChoisie && contenusIndexes.length === 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Aucun contenu de cette formation n'a encore été indexé. L'indexation se fait automatiquement après l'upload.
                </p>
              )}

              {genererMutation.isError && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  {genererMutation.error instanceof Error
                    ? genererMutation.error.message
                    : "La génération a échoué."}
                </p>
              )}

              {genererMutation.data && (
                <div className="mt-3 max-h-[300px] overflow-y-auto rounded-lg bg-[#f7faf9] p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink/80">
                    {genererMutation.data.reponse}
                  </p>

                  {modeGen === "quiz" && genererMutation.data.quiz_propose && (
                    <div className="mt-3 border-t border-[#d7e8e5] pt-3">
                      <p className="text-xs font-bold text-[#21665a]">
                        {variant === "admin" ? "Questions prêtes à importer" : "Quiz de révision"}
                      </p>
                      {variant === "admin" && (
                        <>
                          <p className="mt-1 text-[11px] leading-relaxed text-ink/55">
                            Copiez-les puis collez-les dans « Importer des questions en lot » du questionnaire concerné.
                          </p>
                          <button
                            type="button"
                            onClick={() => copierQuizPourImport(genererMutation.data!.quiz_propose!)}
                            className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#b9ded7] bg-white px-3 py-2 text-[11px] font-bold text-[#21665a] transition-colors hover:bg-[#e7f6f3]"
                          >
                            {quizCopie ? <Check size={14} /> : <ClipboardCopy size={14} />}
                            {quizCopie ? "Copié" : "Copier pour l’import"}
                          </button>
                        </>
                      )}
                      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 font-mono text-[10px] leading-relaxed text-ink/70">
                        {formaterQuizPourImport(genererMutation.data.quiz_propose)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Convertit exactement le contrat structuré de l'assistant vers le format
 * texte reconnu par l'importeur de questionnaires. */
function formaterQuizPourImport(quiz: QuestionCreatePropose[]): string {
  return quiz
    .map((question) => {
      const reponses = question.reponses
        .map((reponse) => `${reponse.est_correcte ? "*" : "-"} ${reponse.texte.trim()}`)
        .join("\n");
      return `Q: ${question.enonce.trim()}\n${reponses}`;
    })
    .join("\n\n");
}

function Onglet({
  actif,
  onClick,
  icone,
  libelle,
}: {
  actif: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  libelle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-[11px] font-bold transition-colors",
        actif
          ? "border-b-2 border-[#315864] bg-white text-ink"
          : "text-ink/50 hover:bg-white/60 hover:text-ink/70",
      )}
    >
      {icone}
      {libelle}
    </button>
  );
}
