import { NextRequest, NextResponse } from "next/server";
import { getSettings, isBookable } from "@/lib/settings";
import { ownerAccessToken } from "@/lib/google";
import { computeSlots, estimateCents, estimateMinutes, loadBusy } from "@/lib/availability";
import { addDaysToKey, dateKey, fromWall, parseDateKey } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/availability?duration=120&from=2026-08-25&days=7
 * ou GET /api/availability?items=shirt:10,suit:2&from=…
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const settings = await getSettings();

  if (!isBookable(settings)) {
    return NextResponse.json(
      { available: false, reason: settings.paused ? "paused" : "not_connected", timezone: settings.timezone },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }

  /* Durée : soit explicite, soit déduite du panier — jamais confiée au client. */
  let duration = Number(url.searchParams.get("duration") ?? 0);
  const rawItems = url.searchParams.get("items");
  if (rawItems) {
    const items = rawItems.split(",").map((p) => {
      const [key, qty] = p.split(":");
      return { key: key?.trim() ?? "", qty: Math.max(0, Math.min(200, Number(qty) || 0)) };
    }).filter((i) => i.key && i.qty > 0);
    duration = estimateMinutes(items, settings);
  }
  if (!Number.isFinite(duration) || duration <= 0) duration = settings.minMinutes;
  duration = Math.min(Math.max(duration, settings.minMinutes), 12 * 60);

  const today = dateKey(new Date(), settings.timezone);
  let from = url.searchParams.get("from") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) from = today;
  if (from < today) from = today;

  const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 14), 1), 31);

  const accessToken = await ownerAccessToken();
  if (!accessToken) {
    return NextResponse.json({ available: false, reason: "not_connected", timezone: settings.timezone }, { status: 200 });
  }

  const timeMin = fromWall({ ...parseDateKey(from), hour: 0, minute: 0 }, settings.timezone);
  const timeMax = fromWall({ ...parseDateKey(addDaysToKey(from, days)), hour: 0, minute: 0 }, settings.timezone);

  try {
    const busy = await loadBusy({ accessToken, settings, timeMin, timeMax });
    const slots = computeSlots({ fromKey: from, days, durationMinutes: duration, settings, busy });

    return NextResponse.json({
      available: true,
      timezone: settings.timezone,
      duration,
      hourlyRate: settings.hourlyRate,
      currency: settings.currency,
      firstHourFree: settings.firstHourFree,
      estimateCents: estimateCents(duration, settings, settings.firstHourFree),
      horizonDays: settings.horizonDays,
      leadHours: settings.leadHours,
      today,
      days: slots,
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false, reason: "calendar_error", timezone: settings.timezone }, { status: 200 });
  }
}
