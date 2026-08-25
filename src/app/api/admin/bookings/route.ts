import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/session";
import { cancelBooking, listBookings, stats } from "@/lib/bookings";
import { ensureSchema, sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireOwner())) return NextResponse.json({ ok: false }, { status: 401 });
  const scope = (new URL(req.url).searchParams.get("scope") ?? "upcoming") as "upcoming" | "past" | "all";
  const [bookings, s] = await Promise.all([listBookings({ scope }), stats()]);
  return NextResponse.json({
    ok: true,
    stats: s,
    bookings: bookings.map((b) => ({
      id: b.id, ref: b.ref, status: b.status, locale: b.locale,
      clientName: b.clientName, clientEmail: b.clientEmail, clientPhone: b.clientPhone,
      address: b.address, city: b.city, postalCode: b.postalCode, notes: b.notes,
      items: b.items, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(),
      durationMinutes: b.durationMinutes, estimateCents: b.estimateCents, currency: b.currency,
      firstHourFree: b.firstHourFree, createdAt: b.createdAt.toISOString(),
      manageToken: b.manageToken,
    })),
  });
}

/** Annulation par l'artisan. */
export async function DELETE(req: NextRequest) {
  if (!(await requireOwner())) return NextResponse.json({ ok: false }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  await ensureSchema();
  const rows = (await sql()`SELECT * FROM nivex_bookings WHERE id = ${id} LIMIT 1`) as Record<string, unknown>[];
  if (!rows[0]) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const all = await listBookings({ scope: "all", limit: 500 });
  const b = all.find((x) => x.id === id);
  if (!b) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (b.status === "cancelled") return NextResponse.json({ ok: true, alreadyCancelled: true });

  await cancelBooking(b, "owner");
  return NextResponse.json({ ok: true });
}
