import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface p-5", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutre",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutre" | "succes" | "attention" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs",
        tone === "neutre" && "bg-ink/5 text-ink/70",
        tone === "succes" && "bg-verdigris-light text-verdigris-dark",
        tone === "attention" && "bg-brass-light text-brass",
        tone === "danger" && "bg-rust-light text-rust",
        className
      )}
      {...props}
    />
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-rust/30 bg-rust-light px-4 py-3 text-sm text-rust">
      {message}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-ink/10",
        className
      )}
    />
  );
}

export function LoadingState({ message = "Chargement…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Spinner className="h-6 w-6 text-verdigris/60" />
      <p className="text-sm text-ink/50">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  titre,
  message,
  action,
}: {
  icon?: ReactNode;
  titre: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      {icon && (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-verdigris-light text-verdigris">
          {icon}
        </div>
      )}
      <div>
        <p className="font-display text-lg font-medium text-ink">{titre}</p>
        {message && (
          <p className="mt-1 text-sm text-ink/55">{message}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
