import type { Dict } from "@/lib/i18n";

/** Ruban défilant — la liste des prestations, comme un ourlet cousu. */
export function Marquee({ t }: { t: Dict }) {
  const items = [...t.marquee, ...t.marquee];
  return (
    <div className="relative overflow-hidden border-y border-gold-300/40 bg-linen-50 py-5">
      <div className="flex w-max gap-10 whitespace-nowrap"
        style={{ animation: "marquee 44s linear infinite" }}>
        {items.map((label, i) => (
          <span key={i} className="flex items-center gap-10 text-[11px] uppercase tracking-[0.26em] text-ink-500">
            {label}<span className="text-gold-400" aria-hidden="true">◆</span>
          </span>
        ))}
      </div>
      {/* fondus latéraux */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-linen-50 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-linen-50 to-transparent" />
      <style>{`@keyframes marquee { to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
