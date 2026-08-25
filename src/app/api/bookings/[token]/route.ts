import { NextRequest, NextResponse } from "next/server";
import { canSelfCancel, cancelBooking, findByManageToken } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const b = await findByManageToken(token).catch(() => null);
  if (!b) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    ref: b.ref, status: b.status, startsAt: b.startsAt.toISOString(),
    durationMinutes: b.durationMinutes, canCancel: canSelfCancel(b),
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const b = await findByManageToken(token).catch(() => null);
  if (!b) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (b.status === "cancelled") return NextResponse.json({ ok: true, alreadyCancelled: true });
  if (!canSelfCancel(b)) return NextResponse.json({ ok: false, error: "too_late" }, { status: 409 });

  await cancelBooking(b, "client");
  return NextResponse.json({ ok: true });
}
