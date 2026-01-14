import { NextResponse } from "next/server";

// Simple allowlist check (no Supabase needed here)
// Put your admin emails in env: ADMIN_EMAIL_ALLOWLIST="a@gmail.com,b@gmail.com"
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    // If email missing, don't leak details
    if (!email) {
      return NextResponse.json({ ok: false }, { status: 200 });
    }

    const allowRaw = process.env.ADMIN_EMAIL_ALLOWLIST || "";
    const allow = allowRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const ok = allow.includes(email);

    // Keep response minimal (avoid giving attackers info)
    return NextResponse.json({ ok }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
