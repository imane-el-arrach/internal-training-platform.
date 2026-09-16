import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Bouton global, affiché après un défilement conséquent sur n'importe quel écran. */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const surveillerDefilement = () => setVisible(window.scrollY > 420);
    surveillerDefilement();
    window.addEventListener("scroll", surveillerDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surveillerDefilement);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full bg-[#315864] text-white shadow-lg shadow-[#17313a]/20 transition hover:-translate-y-0.5 hover:bg-[#1f3e47] focus:outline-none"
      aria-label="Retourner en haut de la page"
      title="Retour en haut"
    >
      <ArrowUp size={19} />
    </button>
  );
}
