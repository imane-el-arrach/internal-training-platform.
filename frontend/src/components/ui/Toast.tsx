import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

type VariantToast = "succes" | "erreur" | "info" | "attention";

interface ToastItem {
  id: number;
  variante: VariantToast;
  message: string;
}

interface ToastContextValue {
  afficher: (message: string, variante?: VariantToast) => void;
  succes: (message: string) => void;
  erreur: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONES: Record<VariantToast, typeof CheckCircle2> = {
  succes: CheckCircle2,
  erreur: XCircle,
  info: Info,
  attention: AlertTriangle,
};

const COULEURS: Record<VariantToast, string> = {
  succes: "border-[#49bfa9]/40 bg-[#eaf6f2] text-[#21665a]",
  erreur: "border-rust/30 bg-rust-light text-rust",
  info: "border-verdigris/30 bg-verdigris-light text-verdigris-dark",
  attention: "border-brass/30 bg-brass-light text-brass",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const fermer = useCallback((id: number) => {
    setToasts((actuels) => actuels.filter((toast) => toast.id !== id));
  }, []);

  const afficher = useCallback(
    (message: string, variante: VariantToast = "info") => {
      const id = Date.now() + Math.random();
      setToasts((actuels) => [...actuels, { id, variante, message }]);
      setTimeout(() => fermer(id), 4500);
    },
    [fermer],
  );

  const value: ToastContextValue = {
    afficher,
    succes: (message: string) => afficher(message, "succes"),
    erreur: (message: string) => afficher(message, "erreur"),
    info: (message: string) => afficher(message, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
        {toasts.map((toast) => {
          const Icone = ICONES[toast.variante];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 shadow-lg animate-[toast-in_0.2s_ease-out]",
                COULEURS[toast.variante],
              )}
              role="alert"
            >
              <Icone size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm font-medium leading-snug">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => fermer(toast.id)}
                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Fermer"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast doit être utilisé dans un ToastProvider");
  }
  return context;
}
