import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/google";

export default function robots(): MetadataRoute.Robots {
  const base = siteOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/fr/reservation/", "/en/reservation/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
