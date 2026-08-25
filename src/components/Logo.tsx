type Props = { className?: string; withSteam?: boolean; title?: string };

/**
 * Le cintre-monogramme du dépliant : un N suspendu, deux volutes de vapeur.
 * Dessiné à la main en SVG pour rester net à toute taille.
 */
export function HangerMark({ className = "h-12 w-auto", withSteam = true, title }: Props) {
  return (
    <svg viewBox="0 0 120 76" fill="none" className={className} role={title ? "img" : "presentation"} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* crochet : montée, boucle, redescente — comme un vrai cintre */}
      <path d="M60 22v-6a7 7 0 0 1 14 0v3.5"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* épaules du cintre */}
      <path d="M60 22 12.5 51.5c-2.4 1.6-1.3 5.4 1.6 5.4h91.8c2.9 0 4-3.8 1.6-5.4L60 22Z"
        stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* barre inférieure */}
      <path d="M17 57h86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      {/* N monogramme */}
      <path d="M47 51V33l26 18V33" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* vapeur */}
      {withSteam && (
        <g className="steam" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85">
          <path d="M87 37c4.2-3.8 4.2-7.6 0-11.4s-4.2-7.6 0-11.4" />
          <path d="M96.5 40c4.2-3.8 4.2-7.6 0-11.4s-4.2-7.6 0-11.4" />
          <path d="M106 36c3.4-3.1 3.4-6.2 0-9.3s-3.4-6.2 0-9.3" />
        </g>
      )}
    </svg>
  );
}

/** Monogramme circulaire, laurier stylisé — pour le pied de page et l'admin. */
export function Crest({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <path d="M40 62V38l20 24V38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[-1, 1].map((s) => (
        <g key={s} transform={`translate(50,50) scale(${s},1) translate(-50,-50)`} opacity="0.55">
          <path d="M26 62c-5-6-6-14-3-21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx={24.5 - i * 0.6} cy={58 - i * 5} rx="2.6" ry="1.5"
              transform={`rotate(${-38 - i * 6} ${24.5 - i * 0.6} ${58 - i * 5})`}
              fill="currentColor" opacity="0.75" />
          ))}
        </g>
      ))}
      <path d="M50 12v5M50 83v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Le mot NIVEX, lettré. */
export function Wordmark({ className = "", as: Tag = "span" }: { className?: string; as?: "span" | "h1" | "div" }) {
  return (
    <Tag className={`font-display font-normal leading-none tracking-[0.24em] ${className}`}>
      NIVEX
    </Tag>
  );
}
