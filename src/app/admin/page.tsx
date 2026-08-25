import { redirect } from "next/navigation";
import { getSession, requireOwner } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { listBookings, stats } from "@/lib/bookings";
import { isDbConfigured } from "@/lib/db";
import { googleConfigured, siteOrigin } from "@/lib/google";
import { Dashboard } from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; warn?: string; scopes?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const owner = await requireOwner();
  if (!owner) redirect("/admin/login?error=not_owner");

  const settings = await getSettings();

  const [upcoming, past, counts] = await Promise.all([
    listBookings({ scope: "upcoming" }).catch(() => []),
    listBookings({ scope: "past", limit: 60 }).catch(() => []),
    stats().catch(() => ({ upcoming: 0, thisMonth: 0, cancelled: 0, total: 0, monthCents: 0, clients: 0 })),
  ]);

  const serialise = (list: Awaited<ReturnType<typeof listBookings>>) =>
    list.map((b) => ({
      id: b.id, ref: b.ref, status: b.status, clientName: b.clientName,
      clientEmail: b.clientEmail, clientPhone: b.clientPhone,
      address: b.address, city: b.city, postalCode: b.postalCode, notes: b.notes,
      items: b.items, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(),
      durationMinutes: b.durationMinutes, estimateCents: b.estimateCents,
      currency: b.currency, firstHourFree: b.firstHourFree, createdAt: b.createdAt.toISOString(),
    }));

  return (
    <Dashboard
      session={owner}
      settings={settings}
      upcoming={serialise(upcoming)}
      past={serialise(past)}
      stats={counts}
      env={{
        database: isDbConfigured(),
        google: googleConfigured(),
        origin: siteOrigin(),
      }}
      flash={{
        connected: sp.connected === "1",
        missingScopes: sp.warn === "missing_scopes" ? (sp.scopes ?? "").split(",").filter(Boolean) : [],
      }}
    />
  );
}
