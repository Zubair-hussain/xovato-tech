// app/api/geo/route.ts
import { NextResponse } from "next/server";

function sanitizeCountryCode(cc?: string | null) {
  const v = (cc || "").trim().toUpperCase();
  return /^[A-Z]{2,3}$/.test(v) ? v : null;
}

// Optional (OFF by default): If you want real geo on localhost,
// set GEO_LOOKUP=1 and GEOLOOKUP_URL to a service you trust.
// (I’m leaving it optional so you don’t accidentally add a dependency.)
async function tryOptionalGeoLookup(_ip: string | null) {
  // You can implement later if you want.
  return null as string | null;
}

export async function GET(req: Request) {
  try {
    const h = new Headers(req.headers);

    // Common platform headers (usually present on deployed environments)
    const fromVercel = sanitizeCountryCode(h.get("x-vercel-ip-country"));
    const fromCF = sanitizeCountryCode(h.get("cf-ipcountry"));
    const fromFly = sanitizeCountryCode(h.get("fly-client-country"));
    const fromFastly = sanitizeCountryCode(h.get("fastly-client-country"));

    // If any header gives a valid country code, use it
    const headerCC = fromVercel || fromCF || fromFly || fromFastly;
    if (headerCC) {
      const source = fromVercel
        ? "vercel"
        : fromCF
        ? "cloudflare"
        : fromFly
        ? "fly"
        : "fastly";

      return NextResponse.json(
        { country_code: headerCC, source },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Localhost / dev: no country headers. Never error.
    // If you later want "real" dev geo, you can add a safe optional lookup.
    const fallbackCC = "PK";

    return NextResponse.json(
      { country_code: fallbackCC, source: "fallback" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { country_code: "PK", source: "fallback" },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
