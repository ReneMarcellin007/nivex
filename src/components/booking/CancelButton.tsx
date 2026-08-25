"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";

export function CancelButton({ token, t }: { token: string; t: Dict }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${token}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error === "too_late" ? t.manage.tooLate : t.booking.errors.generic);
        return;
      }
      router.refresh();
    } catch {
      setError(t.booking.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)}
        className="text-[11px] uppercase tracking-[0.18em] text-ink-400 underline decoration-gold-300 underline-offset-4 transition-colors hover:text-ink-700">
        {t.manage.cancel}
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <p className="text-[0.92rem] text-ink-700">{t.manage.cancelConfirm}</p>
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onClick={cancel} disabled={busy} className="btn !py-3 !px-6 !text-[10px]">
          {busy ? "…" : t.manage.cancel}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost !py-3 !px-6 !text-[10px]">
          {t.booking.back}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 text-[0.85rem] text-[#8E332C]">{error}</p>}
    </div>
  );
}
