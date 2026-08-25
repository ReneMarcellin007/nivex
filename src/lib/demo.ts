import { FALLBACK_SETTINGS, type Settings } from "./settings";
import { computeSlots, estimateMinutes, type DaySlots } from "./availability";
import { dateKey } from "./time";

/**
 * Mode démonstration — pour travailler sur le tunnel de réservation sans
 * base de données ni compte Google branché.
 *
 * Double verrou : la variable NIVEX_DEMO doit valoir "1" **et** l'exécution
 * ne doit pas être en production Vercel. Il n'y a donc aucun chemin par
 * lequel ce mode s'active sur le site public.
 */
export function isDemo(): boolean {
  return process.env.NIVEX_DEMO === "1" && process.env.VERCEL_ENV !== "production";
}

export function demoSettings(): Settings {
  return {
    ...FALLBACK_SETTINGS,
    connected: true,
    ownerEmail: "demo@nivex.local",
    ownerName: "Démonstration",
    connectedAt: new Date().toISOString(),
  };
}

/** Un agenda plausible : quelques rendez-vous déjà pris dans la semaine. */
function demoBusy(now: Date, tz: string) {
  const out: { start: number; end: number }[] = [];
  const day = 24 * 3600_000;
  // Occupations réparties, pour que la grille ne soit pas uniformément vide.
  const plan = [
    { inDays: 1, hour: 9,  hours: 3 },
    { inDays: 1, hour: 15, hours: 2 },
    { inDays: 2, hour: 13, hours: 4 },
    { inDays: 4, hour: 10, hours: 2 },
    { inDays: 5, hour: 9,  hours: 8 },
    { inDays: 8, hour: 14, hours: 3 },
  ];
  for (const p of plan) {
    const d = new Date(now.getTime() + p.inDays * day);
    d.setHours(p.hour, 0, 0, 0);
    out.push({ start: d.getTime(), end: d.getTime() + p.hours * 3600_000 });
  }
  void tz;
  return out;
}

export function demoAvailability(opts: {
  fromKey: string; days: number; items: { key: string; qty: number }[];
}): { settings: Settings; duration: number; days: DaySlots[]; today: string } {
  const settings = demoSettings();
  const now = new Date();
  const today = dateKey(now, settings.timezone);
  const duration = Math.max(estimateMinutes(opts.items, settings), settings.minMinutes);
  return {
    settings,
    duration,
    today,
    days: computeSlots({
      fromKey: opts.fromKey || today,   // sans date de départ, on commence aujourd'hui
      days: opts.days,
      durationMinutes: duration,
      settings,
      busy: demoBusy(now, settings.timezone),
      now,
    }),
  };
}
