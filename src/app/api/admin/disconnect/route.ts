import { NextResponse } from "next/server";
import { requireOwner, clearSession } from "@/lib/session";
import { getRefreshToken, disconnect } from "@/lib/settings";
import { revoke, clearTokenCache } from "@/lib/google";
import { logEvent } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ ok: false }, { status: 401 });

  const refresh = await getRefreshToken().catch(() => null);
  if (refresh) await revoke(refresh);
  await disconnect();
  clearTokenCache();
  await clearSession();
  await logEvent("owner_disconnected", { email: owner.email });

  return NextResponse.json({ ok: true });
}
