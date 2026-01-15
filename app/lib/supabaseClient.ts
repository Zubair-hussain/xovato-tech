// app/lib/supabaseClient.ts
// ✅ Updated: Cloudflare-safe fetch typing + same logging behavior
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const hasUrl = !!SUPABASE_URL;
const hasAnon = !!SUPABASE_ANON;

// One-time warning in dev (avoid spamming)
if (!hasUrl || !hasAnon) {
  // eslint-disable-next-line no-console
  console.warn("[Supabase] Missing env vars:", {
    hasUrl,
    hasAnon,
    note:
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local then restart dev server.",
  });
}

/** Safely parse JSON (without throwing) */
async function safeReadBody(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  try {
    const text = await res.clone().text();
    if (!text) return { text: "", json: null as any };

    if (contentType.includes("application/json")) {
      try {
        return { text, json: JSON.parse(text) };
      } catch {
        return { text, json: null as any };
      }
    }
    return { text, json: null as any };
  } catch {
    return { text: "(unreadable body)", json: null as any };
  }
}

/** Pull a request id header if present (helps in Supabase logs) */
function pickRequestId(res: Response) {
  return (
    res.headers.get("x-request-id") ||
    res.headers.get("x-sb-request-id") ||
    res.headers.get("sb-request-id") ||
    res.headers.get("cf-ray") ||
    null
  );
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: async (input, init) => {
        // ✅ FIX: handle string | URL | Request safely (Cloudflare + Node 22)
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;

        const method = (init?.method || "GET").toUpperCase();

        // IMPORTANT: call native fetch first
        const res = await fetch(input as any, init);

        // Only log reviews/reporting REST failures (avoid noisy logs)
        const isReviewsEndpoint =
          url.includes("/rest/v1/reviews") ||
          url.includes("/rest/v1/review_reports");

        if (isReviewsEndpoint && !res.ok) {
          const { text, json } = await safeReadBody(res);
          const requestId = pickRequestId(res);

          const hint = json?.hint ?? null;
          const details = json?.details ?? null;
          const message =
            json?.message ??
            json?.error_description ??
            json?.error ??
            res.statusText;

          // eslint-disable-next-line no-console
          console.error("[SUPABASE HTTP ERROR]", {
            method,
            url,
            status: res.status,
            statusText: res.statusText,
            requestId,
            message,
            details,
            hint,
            body: text || "(no body)",
            commonCauses:
              res.status === 401
                ? "Auth/session missing or anon key wrong."
                : res.status === 403
                ? "RLS blocked this request (policy)."
                : res.status === 400
                ? "Constraint/check failed or PostgREST error."
                : null,
          });
        }

        return res;
      },
    },
  }
);
