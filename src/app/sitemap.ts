import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/google";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const now = new Date();
  const pages = ["", "/reserver"];

  return ["fr", "en"].flatMap((locale) =>
    pages.map((p) => ({
      url: `${base}/${locale}${p}`,
      lastModified: now,
      changeFrequency: (p === "" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: p === "" ? 1 : 0.8,
      alternates: {
        languages: {
          "fr-CA": `${base}/fr${p}`,
          "en-CA": `${base}/en${p}`,
        },
      },
    })),
  );
}
