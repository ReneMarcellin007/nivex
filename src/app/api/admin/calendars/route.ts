import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/session";
import { listCalendars, ownerAccessToken } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ ok: false }, { status: 401 });
  const at = await ownerAccessToken().catch(() => null);
  if (!at) return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
  try {
    return NextResponse.json({ ok: true, calendars: await listCalendars(at) });
  } catch {
    return NextResponse.json({ ok: false, error: "calendar_error" }, { status: 502 });
  }
}
