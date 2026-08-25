import { NextRequest, NextResponse } from "next/server";
import { BookingInput, BookingError, createBooking } from "@/lib/bookings";
import { ensureSchema, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BookingInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Pot de miel : un robot remplit tous les champs, y compris celui qui est caché.
  if (parsed.data.hp) return NextResponse.json({ ok: true, ref: "NVX-000000" }, { status: 200 });

  // Garde-fou : pas plus de 3 réservations par courriel et par heure.
  try {
    await ensureSchema();
    const recent = (await sql()`
      SELECT count(*)::int AS n FROM nivex_bookings
      WHERE lower(client_email) = ${parsed.data.email} AND created_at > now() - interval '1 hour'`) as { n: number }[];
    if ((recent[0]?.n ?? 0) >= 3) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
  } catch { /* si la base répond mal, createBooking échouera proprement plus bas */ }

  try {
    const booking = await createBooking(parsed.data, req.headers.get("host"));
    return NextResponse.json({
      ok: true,
      ref: booking.ref,
      manageToken: booking.manageToken,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      estimateCents: booking.estimateCents,
      currency: booking.currency,
      firstHourFree: booking.firstHourFree,
    }, { status: 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      const status = e.code === "slot_taken" || e.code === "invalid_slot" ? 409 : 503;
      return NextResponse.json({ ok: false, error: e.code }, { status });
    }
    console.error("[nivex] booking failed:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
