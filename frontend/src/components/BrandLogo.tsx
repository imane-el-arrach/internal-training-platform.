import { Link, useLocation } from "react-router-dom";

export function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  const location = useLocation();

  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5"
      aria-label="EXIA Academy, accueil"
      onClick={(event) => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (location.pathname === "/") {
          event.preventDefault();
          window.location.reload();
        }
      }}
    >
      <img
        src="/logo-exia.png"
        alt="EXIA Technologies"
        className="h-9 w-auto rounded-sm"
      />

      <span className={inverse ? "leading-none text-white" : "leading-none text-ink"}>
        <strong className="block font-display text-base font-medium tracking-tight">
          EXIA
        </strong>
        <small className="block pt-0.5 font-mono text-[9px] font-bold tracking-[0.18em] text-[#49bfa9]">
          ACADEMY
        </small>
      </span>
    </Link>
  );
}
