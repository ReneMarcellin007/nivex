import type { Settings } from "./settings";

/**
 * Coordonnées publiques de la maison.
 *
 * L'adresse courriel affichée suit le compte Google effectivement branché
 * par l'artisan — c'est de là que partent les confirmations, donc c'est
 * celle à laquelle les clients doivent pouvoir répondre. Tant que rien
 * n'est branché, on retombe sur l'adresse imprimée sur le dépliant.
 */
export const FALLBACK_EMAIL = "styve1885@gmail.com";
export const PHONE = "+1 450 943 1217";
export const PHONE_HREF = "tel:+14509431217";

export function contactEmail(settings?: Pick<Settings, "ownerEmail"> | null): string {
  return settings?.ownerEmail?.trim() || FALLBACK_EMAIL;
}

export function contactEmailHref(settings?: Pick<Settings, "ownerEmail"> | null): string {
  return `mailto:${contactEmail(settings)}`;
}
