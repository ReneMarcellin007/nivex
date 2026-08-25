import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/session";
import { cancelBooking, findById, listBookings, stats } from "@/lib/bookings";

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
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const booking = await findById(id).catch(() => null);
  if (!booking) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (booking.status === "cancelled") return NextResponse.json({ ok: true, alreadyCancelled: true });

  await cancelBooking(booking, "owner");
  return NextResponse.json({ ok: true });
}
