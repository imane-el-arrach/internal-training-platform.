import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primaire" | "secondaire" | "danger" | "fantome";
  taille?: "sm" | "md";
}

export function Button({
  variante = "primaire",
  taille = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-card font-sans font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        taille === "md" ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs",
        variante === "primaire" &&
          "bg-verdigris text-white hover:bg-verdigris-dark",
        variante === "secondaire" &&
          "border border-line bg-surface text-ink hover:border-verdigris",
        variante === "danger" && "bg-rust text-white hover:opacity-90",
        variante === "fantome" && "text-ink/70 hover:bg-ink/5",
        className
      )}
      {...props}
    />
  );
}
