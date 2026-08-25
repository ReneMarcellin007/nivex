import { getRefreshToken, getSettings } from "./settings";

/**
 * Client Google minimaliste (OAuth 2.0 + Calendar + Gmail) en fetch pur.
 * Aucune dépendance lourde : moins de surface, démarrage à froid plus rapide.
 */

export const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function creds() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants");
  return { id, secret };
}

/** Origine canonique du site — doit correspondre à l'URI de redirection déclarée chez Google. */
export function siteOrigin(fallbackHost?: string | null): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  if (fallbackHost) return `http${fallbackHost.startsWith("localhost") ? "" : "s"}://${fallbackHost}`;
  return "http://localhost:3000";
}

export function redirectUri(host?: string | null): string {
  return `${siteOrigin(host)}/api/auth/google/callback`;
}

export function authUrl(state: string, host?: string | null): string {
  const { id } = creds();
  const p = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(host),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",              // force la remise d'un refresh_token
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${p}`;
}

export type TokenSet = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
  scope?: string;
};

export async function exchangeCode(code: string, host?: string | null): Promise<TokenSet> {
  const { id, secret } = creds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri(host),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new GoogleError("token_exchange", res.status, await res.text());
  return res.json();
}

export class GoogleError extends Error {
  constructor(public op: string, public status: number, public body: string) {
    super(`Google ${op} a échoué (${status}): ${body.slice(0, 400)}`);
    this.name = "GoogleError";
  }
  /** Le propriétaire a révoqué l'accès ou le jeton est mort. */
  get needsReconnect() {
    return this.status === 400 || this.status === 401 ||
      /invalid_grant|unauthorized|Token has been expired or revoked/i.test(this.body);
  }
}

/* — Cache mémoire du jeton d'accès, par instance serverless — */
let cache: { token: string; expires: number } | null = null;

export async function refreshAccessToken(refresh: string): Promise<string> {
  const { id, secret } = creds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new GoogleError("refresh_token", res.status, await res.text());
  const data = (await res.json()) as TokenSet;
  cache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

/** Jeton d'accès pour le compte du propriétaire. `null` si personne n'est branché. */
export async function ownerAccessToken(): Promise<string | null> {
  if (cache && cache.expires > Date.now()) return cache.token;
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  return refreshAccessToken(refresh);
}

export function clearTokenCache() { cache = null; }

async function api<T>(op: string, url: string, init: RequestInit, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });
  if (!res.ok) throw new GoogleError(op, res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ============================ Profil ============================ */

export type GoogleProfile = { email: string; name?: string; picture?: string; verified_email?: boolean };

export async function userInfo(accessToken: string): Promise<GoogleProfile> {
  return api("userinfo", "https://www.googleapis.com/oauth2/v2/userinfo", { method: "GET" }, accessToken);
}

/* ============================ Calendar ============================ */

export type CalendarSummary = { id: string; summary: string; primary?: boolean; accessRole: string; backgroundColor?: string };

export async function listCalendars(accessToken: string): Promise<CalendarSummary[]> {
  const data = await api<{ items?: CalendarSummary[] }>(
    "calendarList",
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=250",
    { method: "GET" }, accessToken,
  );
  return data.items ?? [];
}

export type Busy = { start: string; end: string };

export async function freeBusy(
  accessToken: string, calendarId: string, timeMin: string, timeMax: string, timeZone: string,
): Promise<Busy[]> {
  const data = await api<{ calendars?: Record<string, { busy?: Busy[]; errors?: unknown[] }> }>(
    "freeBusy",
    "https://www.googleapis.com/calendar/v3/freeBusy",
    { method: "POST", body: JSON.stringify({ timeMin, timeMax, timeZone, items: [{ id: calendarId }] }) },
    accessToken,
  );
  const cal = data.calendars?.[calendarId] ?? Object.values(data.calendars ?? {})[0];
  return cal?.busy ?? [];
}

export type EventInput = {
  calendarId: string;
  summary: string;
  description: string;
  location: string;
  start: string;          // ISO
  end: string;            // ISO
  timeZone: string;
  attendeeEmail?: string;
  attendeeName?: string;
};

export async function createEvent(accessToken: string, e: EventInput): Promise<{ id: string; htmlLink: string }> {
  const body: Record<string, unknown> = {
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: { dateTime: e.start, timeZone: e.timeZone },
    end: { dateTime: e.end, timeZone: e.timeZone },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 120 }, { method: "email", minutes: 1440 }] },
    source: { title: "NIVEX", url: siteOrigin() },
    transparency: "opaque",
  };
  if (e.attendeeEmail) {
    body.attendees = [{ email: e.attendeeEmail, displayName: e.attendeeName, responseStatus: "needsAction" }];
  }
  return api(
    "events.insert",
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(e.calendarId)}/events` +
      `?sendUpdates=${e.attendeeEmail ? "all" : "none"}&conferenceDataVersion=0`,
    { method: "POST", body: JSON.stringify(body) },
    accessToken,
  );
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } },
  );
  // 410 = déjà supprimé, 404 = introuvable : dans les deux cas, l'objectif est atteint.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new GoogleError("events.delete", res.status, await res.text());
  }
}

/* ============================ Gmail ============================ */

function encodeHeader(v: string): string {
  // RFC 2047 pour les accents dans Subject / From
  return /[^\x20-\x7E]/.test(v) ? `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=` : v;
}

export async function sendGmail(
  accessToken: string,
  msg: { to: string; toName?: string; subject: string; html: string; text: string; fromName: string; replyTo?: string; bcc?: string },
): Promise<{ id: string }> {
  const boundary = `nivex_${Math.random().toString(36).slice(2)}`;
  const to = msg.toName ? `${encodeHeader(msg.toName)} <${msg.to}>` : msg.to;

  const headers = [
    `From: ${encodeHeader(msg.fromName)} <me>`,
    `To: ${to}`,
    msg.bcc ? `Bcc: ${msg.bcc}` : null,
    msg.replyTo ? `Reply-To: ${msg.replyTo}` : null,
    `Subject: ${encodeHeader(msg.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join("\r\n");

  const body = [
    "", `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64", "",
    Buffer.from(msg.text, "utf8").toString("base64"),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64", "",
    Buffer.from(msg.html, "utf8").toString("base64"),
    `--${boundary}--`, "",
  ].join("\r\n");

  const raw = Buffer.from(headers + body, "utf8").toString("base64url");

  return api(
    "gmail.send",
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    { method: "POST", body: JSON.stringify({ raw }) },
    accessToken,
  );
}

/** Révoque le jeton côté Google (déconnexion propre). */
export async function revoke(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
  }).catch(() => {});
}

/** Raccourci : jeton + réglages, ou `null` si le service n'est pas branché. */
export async function ownerContext() {
  const settings = await getSettings();
  if (!settings.connected || !googleConfigured()) return null;
  const accessToken = await ownerAccessToken();
  if (!accessToken) return null;
  return { accessToken, settings };
}
