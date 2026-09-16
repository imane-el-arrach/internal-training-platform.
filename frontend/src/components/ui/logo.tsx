import { Link, useLocation } from "react-router-dom";
const logoExia = "/logo-exia.png";

export function AcademyLogo() {
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
      <img className="h-10 w-auto rounded-sm" src={logoExia} alt="EXIA Technologies" />
      <span className="leading-none text-ink">
        <strong className="block font-display text-lg font-medium tracking-tight">EXIA</strong>
        <span className="block pt-0.5 font-mono text-[9px] font-medium tracking-[0.18em] text-brass">
          ACADEMY
        </span>
      </span>
    </Link>
  );
}


export function AppLogo() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <img className="h-9 w-auto rounded-sm" src={logoExia} alt="EXIA Technologies" />
      <span className="leading-none text-ink">
        <strong className="block font-display text-base font-medium tracking-tight">EXIA</strong>
        <small className="block pt-0.5 font-mono text-[9px] font-medium tracking-[0.18em] text-brass">
          ACADEMY
        </small>
      </span>
    </div>
  );
}

export { logoExia };
