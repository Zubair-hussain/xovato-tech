"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

/* ───────────────── TYPES ───────────────── */

type ReviewStatus = "pending" | "approved" | "hidden" | "removed";

type ReviewRow = {
  id: string;
  country_code: string;
  category: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  created_at: string;
  display_name?: string | null;
  reviewer_email?: string | null;
};

/* ───────────────── HELPERS ───────────────── */

const fmtDate = (v: string) => {
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
};

const Stars = ({ rating }: { rating: number }) => {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < r ? "text-yellow-400" : "text-white/15"}>
          ★
        </span>
      ))}
      <span className="ml-2 text-xs text-white/40">{r}/5</span>
    </div>
  );
};

/* ───────────────── FAKE 404 ───────────────── */

function Fake404({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-8">
        <div className="text-sm text-white/50 font-mono">xovatotech://gateway</div>

        <h1 className="mt-6 text-6xl font-black">404</h1>
        <p className="mt-2 text-xl font-semibold">Signal Not Found</p>

        <p className="mt-4 text-sm text-white/60 leading-relaxed">
          The requested endpoint doesn’t exist — or the signal is not authorized
          for this device.
        </p>

        <div className="mt-6 rounded-xl bg-black/60 border border-white/10 p-4 text-xs text-white/60 font-mono">
          • route: /admin/reviews <br />
          • access: denied <br />
          • status: masked
        </div>

        <button
          onClick={onBack}
          className="mt-6 w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 py-3 text-sm"
        >
          Return
        </button>
      </div>
    </div>
  );
}

/* ───────────────── MAIN ───────────────── */

export default function AdminReviewsPage() {
  /* Gate */
  const [checking, setChecking] = useState(true);
  const [gate, setGate] = useState<"enter" | "otp" | "authed" | "denied">("enter");
  const [email, setEmail] = useState("");
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  /* Data */
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─────────────── SESSION CHECK ─────────────── */

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (user?.email) {
        setMe(user.email);
        setGate("authed");
      } else {
        setGate("enter");
      }

      setChecking(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const mail = s?.user?.email || null;
      setMe(mail);
      if (mail) setGate("authed");
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  /* ─────────────── LOAD REVIEWS ─────────────── */

  const load = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Access denied or failed to load data.");
      setRows([]);
    } else {
      setRows((data ?? []) as ReviewRow[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (gate === "authed") load();
  }, [gate]);

  /* ─────────────── ACTIONS ─────────────── */

  const setStatus = async (id: string, status: ReviewStatus) => {
    setError(null);

    const { error } = await supabase
      .from("reviews")
      .update({ status })
      .eq("id", id);

    if (error) {
      setError("Update failed. RLS blocked this action.");
      return;
    }

    setRows((p) => p.filter((r) => r.id !== id));
  };

  const requestOTP = async () => {
    setGateMsg(null);
    const clean = email.trim().toLowerCase();

    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean);
    if (!ok) {
      setGate("denied");
      return;
    }

    const res = await fetch(`/api/admin/check?email=${encodeURIComponent(clean)}`);
    if (!res.ok) {
      setGate("denied");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/reviews`,
      },
    });

    if (error) {
      setGateMsg("Failed to send login email.");
      return;
    }

    setGate("otp");
    setGateMsg("Login link sent. Check inbox & spam.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setGate("enter");
    setMe(null);
    setRows([]);
  };

  /* ─────────────── METRICS ─────────────── */

  const pendingCount = rows.length;

  const byCountry = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.country_code, (m.get(r.country_code) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);

  /* ─────────────── STATES ─────────────── */

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-sm text-white/60">
        Loading gateway…
      </div>
    );
  }

  if (gate === "denied") {
    return <Fake404 onBack={() => setGate("enter")} />;
  }

  if (gate === "enter" || gate === "otp") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-8">
          <div className="text-sm font-mono text-white/50">
            xovatotech://admin-signal
          </div>

          <h1 className="mt-4 text-2xl font-semibold">Moderation Console</h1>
          <p className="mt-2 text-sm text-white/60">
            Authorized Gmail required. Unauthorized access is masked.
          </p>

          <div className="mt-6">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Authorized Gmail"
              type="email"
              className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-400/30"
            />

            {gateMsg && (
              <div className="mt-4 text-sm text-emerald-400">{gateMsg}</div>
            )}

            <button
              onClick={requestOTP}
              className="mt-5 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black py-3 text-sm font-semibold"
            >
              {gate === "otp" ? "Resend Login Link" : "Send Login Link"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── DASHBOARD ─────────────── */

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="text-sm font-mono text-white/50">
              xovatotech://moderation
            </div>
            <h1 className="mt-2 text-3xl font-semibold">Pending Reviews</h1>
            <p className="mt-1 text-sm text-white/60">
              Approve to publish. Hide or remove to block.
            </p>
            <div className="mt-1 text-xs text-white/40">Signed in as {me}</div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-4 py-2 text-sm"
            >
              Refresh
            </button>
            <button
              onClick={signOut}
              className="rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-4 py-2 text-sm text-white/60"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-zinc-950 border border-white/10 p-5">
            <div className="text-xs text-white/50">Pending Queue</div>
            <div className="mt-2 text-3xl font-bold">{pendingCount}</div>
          </div>

          <div className="rounded-2xl bg-zinc-950 border border-white/10 p-5">
            <div className="text-xs text-white/50">Top Countries</div>
            <div className="mt-3 space-y-1 text-sm">
              {byCountry.map(([cc, n]) => (
                <div key={cc} className="flex justify-between text-white/70">
                  <span>{cc}</span>
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-950 border border-white/10 p-5">
            <div className="text-xs text-white/50">Signal Health</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              <span className="text-sm text-white/70">RLS Enforced</span>
            </div>
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-400/10 px-5 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-sm text-white/60">Loading reviews…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-white/60">No pending reviews.</div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl bg-zinc-950 border border-white/10 p-6"
              >
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold truncate">
                      {r.title || "(no title)"}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
                      <span className="text-white/70">
                        {r.display_name || "Anonymous"}
                      </span>
                      • {r.country_code} • {r.category}
                      <Stars rating={r.rating} />
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      {fmtDate(r.created_at)}
                      {r.reviewer_email && ` • ${r.reviewer_email}`}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setStatus(r.id, "approved")}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-black text-sm font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus(r.id, "hidden")}
                      className="px-4 py-2 rounded-xl bg-yellow-500 text-black text-sm font-semibold"
                    >
                      Hide
                    </button>
                    <button
                      onClick={() => setStatus(r.id, "removed")}
                      className="px-4 py-2 rounded-xl bg-red-500 text-black text-sm font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                  {r.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
