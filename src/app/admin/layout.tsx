import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace artisan",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-linen-100">{children}</div>;
}
