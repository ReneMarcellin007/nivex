/** Petites fonctions partagées par le tunnel de réservation. */

export const POSTAL_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalisePostal(v: string): string {
  const c = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  return c.length > 3 ? `${c.slice(0, 3)} ${c.slice(3)}` : c;
}

/** Met en forme un numéro nord-américain au fil de la frappe. */
export function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").replace(/^1/, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isPhoneValid(v: string): boolean {
  return v.replace(/\D/g, "").replace(/^1/, "").length === 10;
}

/** Regroupe les créneaux d'une journée en matin / après-midi / soirée. */
export function groupSlots(slots: { time: string; iso: string }[]) {
  const morning: typeof slots = [], afternoon: typeof slots = [], evening: typeof slots = [];
  for (const s of slots) {
    const h = Number(s.time.slice(0, 2));
    if (h < 12) morning.push(s);
    else if (h < 17) afternoon.push(s);
    else evening.push(s);
  }
  return { morning, afternoon, evening };
}
