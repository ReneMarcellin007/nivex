import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/admin/login", req.url), { status: 303 });
}
