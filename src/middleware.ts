import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "@/lib/i18n";

const PUBLIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|woff2?)$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const seg = pathname.split("/")[1];
  if (locales.includes(seg as (typeof locales)[number])) {
    const res = NextResponse.next();
    res.headers.set("x-nivex-locale", seg);
    return res;
  }

  // Négociation de langue : le français reste la valeur par défaut au Québec.
  const accept = req.headers.get("accept-language") ?? "";
  const prefersEnglish = /^\s*en\b/i.test(accept) && !/\bfr\b/i.test(accept.split(",")[0] ?? "");
  const locale = prefersEnglish ? "en" : defaultLocale;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
