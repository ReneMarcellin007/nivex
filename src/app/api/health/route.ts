import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { googleConfigured, ownerAccessToken, siteOrigin } from "@/lib/google";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Diagnostic d'installation — aucun secret n'est exposé. */
export async function GET() {
  const settings = await getSettings();
  let calendarOk: boolean | null = null;
  if (settings.connected && googleConfigured()) {
    calendarOk = Boolean(await ownerAccessToken().catch(() => null));
  }
  return NextResponse.json({
    ok: true,
    origin: siteOrigin(),
    env: {
      database: isDbConfigured(),
      google: googleConfigured(),
      encryptionKey: Boolean(process.env.ENCRYPTION_KEY),
      sessionSecret: Boolean(process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY),
      setupCode: Boolean(process.env.ADMIN_SETUP_CODE),
    },
    owner: { connected: settings.connected, email: settings.ownerEmail, paused: settings.paused },
    calendar: { id: settings.calendarId, tokenUsable: calendarOk, timezone: settings.timezone },
  }, { headers: { "cache-control": "no-store" } });
}
