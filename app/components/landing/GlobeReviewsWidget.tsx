// app/components/landing/GlobeReviewsWidget.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import emailjs from "@emailjs/browser";

import { supabase } from "../../lib/supabaseClient";
import ShinyText from "./ShinyText";
import earthPeople from "./Earth-Data.json";

/* ──────────────────────────────────────────────── */
/* TYPES */
/* ──────────────────────────────────────────────── */
type ReviewRow = {
  id: string;
  country_code: string;
  category: string;
  rating: number;
  title: string | null;
  comment: string;
  status: "pending" | "approved" | "hidden" | "removed";
  created_at: string;
  display_name?: string | null;
  image?: string | null;

  reviewer_email?: string | null;
  email_verified?: boolean | null;
};

type EarthPerson = { name: string; country: string; image: string };

/* ──────────────────────────────────────────────── */
/* HELPERS */
/* ──────────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5">
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <span key={i} className={i < r ? "text-yellow-400" : "text-zinc-600"}>
            ★
          </span>
        ))}
    </div>
  );
}

function initials(name?: string | null) {
  if (!name?.trim()) return "GU";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => (p?.[0] ? p[0].toUpperCase() : ""))
    .join("");
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/* ------------------------- ERROR LOGGING ------------------------- */
function logAnyError(label: string, err: unknown) {
  // eslint-disable-next-line no-console
  console.error(label);

  if (err instanceof Error) {
    // eslint-disable-next-line no-console
    console.error({ name: err.name, message: err.message, stack: err.stack });
    return;
  }

  try {
    // eslint-disable-next-line no-console
    console.error("raw:", err);
    // eslint-disable-next-line no-console
    console.error("json:", JSON.stringify(err, Object.getOwnPropertyNames(err as any), 2));
  } catch {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

function logSupabaseError(error: any) {
  // eslint-disable-next-line no-console
  console.error("Supabase error:", {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  });

  try {
    // eslint-disable-next-line no-console
    console.error("Descriptors:", Object.getOwnPropertyDescriptors(error ?? {}));
  } catch {}
}

/* ------------------------- EMAILJS HARD LOG ------------------------- */
function logEmailJSError(err: unknown) {
  // eslint-disable-next-line no-console
  console.error("[EmailJS] send FAILED (raw):", err);

  try {
    // eslint-disable-next-line no-console
    console.error(
      "[EmailJS] send FAILED (props):",
      JSON.stringify(err, Object.getOwnPropertyNames(err as any), 2)
    );
  } catch {}

  // eslint-disable-next-line no-console
  console.error("[EmailJS] send FAILED (status/text):", {
    status: (err as any)?.status,
    text: (err as any)?.text,
  });
}

/* ------------------------- EMAILJS DIRECT API ------------------------- */
async function sendEmailJSDirect(payload: {
  service_id: string;
  template_id: string;
  public_key: string;
  template_params: Record<string, any>;
}) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: payload.service_id,
      template_id: payload.template_id,
      user_id: payload.public_key,
      template_params: payload.template_params,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`EmailJS HTTP ${res.status}: ${text}`);
  return text;
}

/* ──────────────────────────────────────────────── */
/* FIX: WebGL framebuffer “Attachment has zero size” */
/* ──────────────────────────────────────────────── */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return { ref, ...size };
}

const LS_KEYS = {
  experience: "globeReviews.experience",
  regionIndex: "globeReviews.regionIndex",
  progress: "globeReviews.progress",
  draft: "globeReviews.draft",
} as const;

/* ──────────────────────────────────────────────── */
/* EARTH DOTS & TEXTURE LOGIC */
/* ──────────────────────────────────────────────── */
const EARTH_TEX_URL = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";

function imageToImageData(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function latLonToUV(lat: number, lon: number) {
  return { u: (lon + 180) / 360, v: (90 - lat) / 180 };
}

function looksLikeLand(r: number, g: number, b: number) {
  const rf = r / 255,
    gf = g / 255,
    bf = b / 255;
  const blueDom = bf - (rf + gf) * 0.5;
  const luminance = 0.2126 * rf + 0.7152 * gf + 0.0722 * bf;
  if (luminance > 0.92) return false;
  return blueDom < 0.06;
}

function makeEarthLandDotsFromTexture(imgData: ImageData, count = 2600, radius = 1.05) {
  const positions: number[] = [];
  const colors: number[] = [];

  const gray = new THREE.Color("#b9bec7");
  const blue = new THREE.Color("#4aa3ff");

  const w = imgData.width;
  const h = imgData.height;
  const data = imgData.data;

  const maxTries = count * 30;
  let tries = 0;

  while (positions.length / 3 < count && tries < maxTries) {
    tries++;

    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const lat = 90 - (phi * 180) / Math.PI;
    const lon = (theta * 180) / Math.PI - 180;

    const uv = latLonToUV(lat, lon);
    const px = Math.min(w - 1, Math.max(0, Math.floor(uv.u * (w - 1))));
    const py = Math.min(h - 1, Math.max(0, Math.floor(uv.v * (h - 1))));

    const idx = (py * w + px) * 4;
    const rr = data[idx],
      gg = data[idx + 1],
      bb = data[idx + 2];

    if (!looksLikeLand(rr, gg, bb)) continue;

    const sinPhi = Math.sin(phi);
    positions.push(
      radius * sinPhi * Math.cos(theta),
      radius * Math.cos(phi),
      radius * sinPhi * Math.sin(theta)
    );

    const glint = Math.random() < 0.07;
    const c = glint ? blue.clone().lerp(gray, 0.25) : gray;
    colors.push(c.r, c.g, c.b);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geom.computeBoundingSphere();
  return geom;
}

/* ──────────────────────────────────────────────── */
/* REGIONS */
/* ──────────────────────────────────────────────── */
const REGIONS = [
  { label: "Asia", countries: ["PK", "IN", "BD", "JP", "SG"] },
  { label: "Middle East", countries: ["AE", "SA", "QA", "KW", "OM"] },
  { label: "Europe", countries: ["GB", "DE", "FR", "NL", "ES", "IT"] },
  { label: "North America", countries: ["US", "CA", "MX"] },
  { label: "Africa", countries: ["NG", "KE", "ZA", "EG", "MA"] },
  { label: "Oceania", countries: ["AU", "NZ"] },
] as const;

function getRegionIndexForCountry(code: string) {
  const idx = REGIONS.findIndex((r) => r.countries.includes(code));
  return idx === -1 ? 0 : idx;
}

/* ──────────────────────────────────────────────── */
/* DEMO PEOPLE + FALLBACK REVIEWS */
/* ──────────────────────────────────────────────── */
function ccToCountryName(cc: string) {
  const map: Record<string, string> = {
    US: "United States",
    CA: "Canada",
    MX: "Mexico",
    FR: "France",
    DE: "Germany",
    NL: "Netherlands",
    GB: "United Kingdom",
    IN: "India",
    AU: "Australia",
    NZ: "New Zealand",
    PK: "Pakistan",
    AE: "United Arab Emirates",
    SA: "Saudi Arabia",
  };
  return map[cc] ?? "Pakistan";
}

function pickDemoPeopleForCountry(countryCode: string, count: number) {
  const target = ccToCountryName(countryCode);
  const all = earthPeople as EarthPerson[];
  const list = all.filter((p) => p.country === target);
  const pool = list.length ? list : all;

  const picked: EarthPerson[] = [];
  const used = new Set<number>();
  const triesMax = Math.max(20, count * 6);

  for (let t = 0; t < triesMax && picked.length < count; t++) {
    const idx = Math.floor(Math.random() * pool.length);
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]);
  }
  while (picked.length < count && pool.length) {
    picked.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return picked.slice(0, count);
}

function buildDemoReviews(countryCode: string, category: string): ReviewRow[] {
  const people = pickDemoPeopleForCountry(countryCode, 4);
  const now = Date.now();

  const templates = [
    {
      title: "Premium UI & smooth flow",
      comment:
        "Animations feel clean and modern. The layout is fast, responsive, and the overall experience feels premium.",
      rating: 5,
    },
    {
      title: "Super professional delivery",
      comment:
        "Communication was clear, changes were handled quickly, and the final result looked exactly as expected.",
      rating: 5,
    },
    {
      title: "Solid work & great support",
      comment:
        "A couple of tweaks were needed, but everything was fixed fast and the project was delivered on time.",
      rating: 4,
    },
    {
      title: "Highly recommended",
      comment:
        "Design is modern, performance is strong, and the attention to detail is excellent. Would work again.",
      rating: 5,
    },
  ];

  return templates.map((t, i) => ({
    id: `demo-${countryCode}-${i}`,
    country_code: countryCode,
    category,
    rating: t.rating,
    title: t.title,
    comment: t.comment,
    status: "approved",
    created_at: new Date(now - (i + 1) * 86400000).toISOString(),
    display_name: people[i]?.name ?? "Guest User",
    image: people[i]?.image ?? null,
    reviewer_email: null,
    email_verified: true,
  }));
}

/* ──────────────────────────────────────────────── */
/* SUPABASE FETCH */
/* ──────────────────────────────────────────────── */
async function fetchApprovedReviews(countryCode?: string, category?: string) {
  let q = supabase
    .from("reviews")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (countryCode) q = q.eq("country_code", countryCode);
  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
}

/* ──────────────────────────────────────────────── */
/* GEO */
/* ──────────────────────────────────────────────── */
async function detectUserCountry() {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (!res.ok) return "PK";
    const json = await res.json().catch(() => null);
    const cc = (json?.country_code || "PK") as string;
    return cc && typeof cc === "string" ? cc : "PK";
  } catch {
    return "PK";
  }
}

/* ──────────────────────────────────────────────── */
/* SCENE: faint dark sphere so globe is always visible */
/* ──────────────────────────────────────────────── */
function GlobeBase() {
  return (
    <mesh>
      <sphereGeometry args={[1.02, 48, 48]} />
      <meshStandardMaterial
        color={"#05080f"}
        emissive={"#03060b"}
        emissiveIntensity={0.4}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

/* ──────────────────────────────────────────────── */
/* GLOBE DOTS */
/* ──────────────────────────────────────────────── */
function GlobeDots({
  experienceProgressRef,
  active,
}: {
  experienceProgressRef: React.MutableRefObject<number>;
  active: boolean;
}) {
  const ptsRef = useRef<THREE.Points>(null);

  const dragging = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const yawOffset = useRef(0);
  const pitchOffset = useRef(0);

  const tex = useLoader(THREE.TextureLoader, EARTH_TEX_URL, (loader) => {
    loader.crossOrigin = "anonymous";
  });

  const geom = useMemo(() => {
    const img = tex?.image as HTMLImageElement | undefined;
    if (!img || typeof document === "undefined") return new THREE.BufferGeometry();

    const data = imageToImageData(img);
    if (!data) return new THREE.BufferGeometry();
    return makeEarthLandDotsFromTexture(data, 2800, 1.06);
  }, [tex]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.024,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    []
  );

  const ASIA_YAW = useMemo(() => -((100 * Math.PI) / 180), []);

  useFrame(() => {
    if (!ptsRef.current) return;

    const p = experienceProgressRef.current;
    const yawBase = ASIA_YAW + p * Math.PI * 2.35;
    const pitchBase = (12 * Math.PI) / 180 + Math.sin(Date.now() * 0.0006) * 0.02;

    ptsRef.current.rotation.y = yawBase + (active ? yawOffset.current : 0);
    ptsRef.current.rotation.x = pitchBase + (active ? pitchOffset.current : 0);

    const s = 1 + Math.sin(Date.now() * 0.001) * 0.006;
    ptsRef.current.scale.setScalar(s);
  });

  return (
    <points
      ref={ptsRef}
      geometry={geom}
      material={mat}
      onPointerDown={(e) => {
        if (!active) return;
        dragging.current = true;
        prev.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      }}
      onPointerLeave={() => {
        dragging.current = false;
      }}
      onPointerMove={(e) => {
        if (!active || !dragging.current) return;
        const dx = e.clientX - prev.current.x;
        const dy = e.clientY - prev.current.y;
        prev.current = { x: e.clientX, y: e.clientY };

        yawOffset.current += dx * 0.006;
        pitchOffset.current += dy * 0.006;
        pitchOffset.current = Math.max(-0.6, Math.min(0.6, pitchOffset.current));
      }}
    />
  );
}

/* ──────────────────────────────────────────────── */
/* MAIN */
/* ──────────────────────────────────────────────── */
export default function GlobeReviewsWidget({ category = "Web App" }: { category?: string }) {
  const [experience, setExperience] = useState(false);

  const progressRef = useRef(0);
  const [progressUI, setProgressUI] = useState(0);

  const [regionIndex, setRegionIndex] = useState(0);
  const currentRegion = REGIONS[regionIndex % REGIONS.length];

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>("PK");

  const overlayRef = useRef<HTMLDivElement | null>(null);

  // form
  const [showForm, setShowForm] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");

  // email required
  const [reviewerEmail, setReviewerEmail] = useState("");

  // ✅ MOBILE: show ONE active card (prevents overlap)
  const [mobileIndex, setMobileIndex] = useState(0);

  // Canvas container size guard
  const { ref: canvasWrapRef, w, h } = useElementSize<HTMLDivElement>();
  const canRenderCanvas = w > 40 && h > 40;

  /* restore */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedRegion = localStorage.getItem(LS_KEYS.regionIndex);
    const savedProgress = localStorage.getItem(LS_KEYS.progress);
    const draft = localStorage.getItem(LS_KEYS.draft);

    if (savedRegion) setRegionIndex(Number(savedRegion) || 0);
    if (savedProgress) {
      const p = clamp01(Number(savedProgress) || 0);
      progressRef.current = p;
      setProgressUI(p);
    }

    if (draft) {
      try {
        const d = JSON.parse(draft);
        setDisplayName(d.displayName ?? "");
        setReviewerEmail(d.reviewerEmail ?? "");
        setTitle(d.title ?? "");
        setComment(d.comment ?? "");
        setRating(Number(d.rating ?? 5));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LS_KEYS.regionIndex, String(regionIndex));
    localStorage.setItem(LS_KEYS.progress, String(progressUI));
  }, [regionIndex, progressUI]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      LS_KEYS.draft,
      JSON.stringify({ displayName, reviewerEmail, title, comment, rating })
    );
  }, [displayName, reviewerEmail, title, comment, rating]);

  /* emailjs init */
  useEffect(() => {
    const pub = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    if (!pub) {
      // eslint-disable-next-line no-console
      console.warn("[EmailJS] missing NEXT_PUBLIC_EMAILJS_PUBLIC_KEY");
      return;
    }
    emailjs.init({ publicKey: pub });
  }, []);

  /* detect country */
  useEffect(() => {
    (async () => {
      const cc = await detectUserCountry();
      setUserCountry(cc);
      const idx = getRegionIndexForCountry(cc);
      setRegionIndex(idx);

      setProgressUI((p) => {
        if (p > 0) return p;
        const base = idx / REGIONS.length;
        progressRef.current = base;
        return base;
      });
    })();
  }, []);

  /* ──────────────────────────────────────────────── */
  /* ✅ WEBSITE SCROLL LOCK                            */
  /* ──────────────────────────────────────────────── */
  const shouldLockScroll = experience || showForm || showPolicy;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    if (shouldLockScroll) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
    } else {
      html.style.overflow = prevHtmlOverflow || "";
      body.style.overflow = prevBodyOverflow || "";
    }

    return () => {
      html.style.overflow = prevHtmlOverflow || "";
      body.style.overflow = prevBodyOverflow || "";
    };
  }, [shouldLockScroll]);

  /* ESC exit */
  useEffect(() => {
    if (!experience) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExperience(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [experience]);

  /* wheel rotation ONLY on overlay (and disabled when modal open) */
  useEffect(() => {
    if (!experience) return;
    if (showForm || showPolicy) return; // ✅ if modal is open, DO NOT rotate
    const el = overlayRef.current;
    if (!el) return;

    let velocity = 0;
    let raf = 0;

    const tick = () => {
      const next = clamp01(progressRef.current + velocity);
      progressRef.current = next;
      velocity *= 0.93;

      setProgressUI((p) => p * 0.88 + next * 0.12);

      const idx = Math.floor(next * REGIONS.length);
      setRegionIndex(Math.min(REGIONS.length - 1, Math.max(0, idx)));

      if (Math.abs(velocity) > 0.00005) raf = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      velocity += e.deltaY * 0.00009;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel as any);
      cancelAnimationFrame(raf);
    };
  }, [experience, showForm, showPolicy]);

  /* load reviews */
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const country = currentRegion.countries.includes(userCountry)
          ? userCountry
          : currentRegion.countries[0];

        const data = await fetchApprovedReviews(country, category);
        const finalRows = data.length > 0 ? data : buildDemoReviews(country, category);

        if (mounted) setReviews(finalRows);
      } catch (err) {
        logAnyError("fetchApprovedReviews failed:", err);

        const country = currentRegion.countries.includes(userCountry)
          ? userCountry
          : currentRegion.countries[0];

        if (mounted) setReviews(buildDemoReviews(country, category));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [regionIndex, category, userCountry]);

  /* card visibility thresholds (4 sides) */
  const cards = [
    { row: reviews[0], visible: progressUI > 0.14 },
    { row: reviews[1], visible: progressUI > 0.34 },
    { row: reviews[2], visible: progressUI > 0.56 },
    { row: reviews[3], visible: progressUI > 0.78 },
  ];

  // ✅ MOBILE: derive active index from scroll progress
  useEffect(() => {
    if (!experience) return;
    const idx =
      progressUI > 0.78 ? 3 : progressUI > 0.56 ? 2 : progressUI > 0.34 ? 1 : progressUI > 0.14 ? 0 : 0;
    setMobileIndex(idx);
  }, [progressUI, experience]);

  const mobileRow = cards[mobileIndex]?.row;
  const mobileVisible = cards[mobileIndex]?.visible ?? false;

  /* ──────────────────────────────────────────────── */
  /* ✅ Submit review + EmailJS */
  /* ──────────────────────────────────────────────── */
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccess(false);

    const cleanTitle = title.trim();
    const cleanComment = comment.trim();
    const cleanName = displayName.trim();
    const cleanEmail = reviewerEmail.trim().toLowerCase();

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(cleanEmail);

    if (!cleanName || !cleanTitle || !cleanComment || !cleanEmail) {
      setErrorMsg("Please fill in all fields (including email).");
      setSubmitting(false);
      return;
    }
    if (!emailOk) {
      setErrorMsg("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMsg("Please select a rating between 1 and 5.");
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("reviews").insert([
        {
          country_code: userCountry,
          category,
          rating,
          title: cleanTitle,
          comment: cleanComment,
          display_name: cleanName,
          reviewer_email: cleanEmail,
        },
      ]);

      if (error) {
        logSupabaseError(error);
        setErrorMsg(
          error.code === "42501"
            ? "Submission blocked by security policy (RLS)."
            : error.message || "Failed to submit. Please try again."
        );
        throw error;
      }

      setSuccess(true);
      setTitle("");
      setComment("");
      setDisplayName("");
      setReviewerEmail("");
      setRating(5);
      window.setTimeout(() => setShowForm(false), 1800);

      const SERVICE = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const TO_EMAIL = process.env.NEXT_PUBLIC_REVIEW_NOTIFY_EMAIL;
      const PUB = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      // eslint-disable-next-line no-console
      console.log("[EmailJS] env", {
        SERVICE,
        TEMPLATE,
        TO_EMAIL,
        hasService: !!SERVICE,
        hasTemplate: !!TEMPLATE,
        hasToEmail: !!TO_EMAIL,
        hasPub: !!PUB,
        origin: typeof window !== "undefined" ? window.location.origin : "n/a",
      });

      if (SERVICE && TEMPLATE && TO_EMAIL && PUB) {
        const params = {
          to_email: TO_EMAIL,
          display_name: cleanName || "Anonymous",
          reviewer_email: cleanEmail,
          title: cleanTitle || "(no title)",
          comment: cleanComment,
          rating: String(rating),
          country_code: userCountry,
          category,
        };

        try {
          // eslint-disable-next-line no-console
          console.log("[EmailJS] sending (sdk)...");
          const resp = await emailjs.send(SERVICE, TEMPLATE, params);
          // eslint-disable-next-line no-console
          console.log("[EmailJS] sent OK (sdk):", resp);
        } catch (sdkErr) {
          logEmailJSError(sdkErr);

          try {
            // eslint-disable-next-line no-console
            console.log("[EmailJS] retrying (direct http)...");
            const respText = await sendEmailJSDirect({
              service_id: SERVICE,
              template_id: TEMPLATE,
              public_key: PUB,
              template_params: params,
            });
            // eslint-disable-next-line no-console
            console.log("[EmailJS] sent OK (direct):", respText);
          } catch (directErr) {
            logAnyError("[EmailJS] direct send failed:", directErr);
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn("[EmailJS] skipped: missing env", { SERVICE, TEMPLATE, TO_EMAIL, PUB });
      }
    } catch (err) {
      logAnyError("Submit review failed:", err);
      setErrorMsg((prev) => prev ?? "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* positions for desktop corners */
  const cornerPositions = [
    "top-12 sm:top-16 md:top-20 left-2 sm:left-4 md:left-12",
    "top-12 sm:top-16 md:top-20 right-2 sm:right-4 md:right-12",
    "bottom-24 sm:bottom-32 left-2 sm:left-4 md:left-12",
    "bottom-24 sm:bottom-32 right-2 sm:right-4 md:right-12",
  ];

  // show modal inside this widget layout when experience is active
  const modalKind = experience ? "absolute" : "fixed";

  // hide scrollbar visually (without breaking scroll if needed)
  const hideScrollbarStyle: React.CSSProperties = {
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  };

  return (
    <section className="relative w-full bg-black">
      <div
        className={`relative w-full bg-black ${
          experience ? "h-[100svh]" : "h-[420px] sm:h-[520px] md:h-[640px] lg:h-[720px]"
        }`}
      >
        {/* Globe layer */}
        <div
          className={`absolute inset-0 z-0 flex items-center justify-center bg-black transition-all duration-300 ${
            showForm ? "blur-[10px] opacity-60" : "blur-0 opacity-100"
          }`}
        >
          <div
            ref={canvasWrapRef}
            className="relative w-[180px] h-[180px] sm:w-[320px] sm:h-[320px] md:w-[420px] md:h-[420px] lg:w-[520px] lg:h-[520px] xl:w-[600px] xl:h-[600px]"
          >
            {canRenderCanvas ? (
              <Canvas
                dpr={[1, 1.75]}
                camera={{ position: [0, 0, 2.85], fov: 45 }}
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: "high-performance",
                  preserveDrawingBuffer: false,
                }}
                style={{ width: "100%", height: "100%" }}
              >
                <ambientLight intensity={0.75} />
                <directionalLight position={[5, 4, 5]} intensity={1.4} />
                <Environment preset="city" />
                <Suspense fallback={null}>
                  <GlobeBase />
                  <GlobeDots experienceProgressRef={progressRef} active={experience} />
                </Suspense>
              </Canvas>
            ) : (
              <div className="w-full h-full rounded-full bg-[#05080f]" />
            )}
          </div>
        </div>

        {/* Center text when NOT experience */}
        {!experience && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 md:px-8">
            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              What Clients Say About Our Work
            </h2>
            <p className="text-white/65 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 max-w-md sm:max-w-lg md:max-w-xl">
              Click start, then scroll inside the experience to rotate the globe and reveal reviews.
            </p>

            <div className="inline-flex items-center gap-3 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-black text-xs sm:text-sm text-white/80">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4aa3ff] shadow-[0_0_18px_rgba(74,163,255,0.6)]" />
              {currentRegion.label}
            </div>

            <div className="mt-6 sm:mt-8">
              <button
                onClick={() => {
                  setExperience(true);
                  const base = regionIndex / REGIONS.length;
                  progressRef.current = base;
                  setProgressUI(base);
                  try {
                    localStorage.setItem(LS_KEYS.experience, "1");
                  } catch {}
                }}
                className="group relative inline-flex h-10 sm:h-12 items-center justify-center overflow-hidden rounded-full p-[2px] transition-transform duration-300 hover:scale-105 active:scale-95"
              >
                <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#10b981_50%,#000000_100%)]" />
                <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-black px-6 sm:px-8 text-xs sm:text-sm font-bold text-white backdrop-blur-3xl transition-colors duration-300 group-hover:bg-zinc-900">
                  <ShinyText text="Start Experience" speedMs={1400} />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Experience overlay */}
        {experience && (
          <div ref={overlayRef} className="absolute inset-0 z-30 pointer-events-auto bg-transparent">
            {/* TOP BAR + EXIT */}
            <div className="absolute top-0 left-0 w-full p-3 sm:p-4 md:p-6 flex justify-between items-start z-40">
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black text-[10px] sm:text-[11px] md:text-xs text-white/70 font-mono">
                SCROLL TO EXPLORE
              </div>

              <button
                type="button"
                onClick={() => setExperience(false)}
                className="hidden md:inline-flex items-center gap-2 rounded-full bg-zinc-950/80 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-white/80 hover:text-white hover:bg-zinc-900/80 border border-white/10 transition"
              >
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.6)]" />
                Exit Experience
              </button>
            </div>

            {/* ✅ Bottom controls (always visible) */}
            <div className="absolute left-0 w-full flex justify-center items-center gap-3 sm:gap-4 px-3 sm:px-4 z-40 bottom-48 sm:bottom-56 md:bottom-6">
              <button
                type="button"
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setSuccess(false);
                  setErrorMsg(null);
                  setShowForm(true);
                }}
                className="group relative px-4 sm:px-5 py-2 sm:py-3 rounded-full text-white text-xs sm:text-sm font-semibold border border-emerald-400/20 bg-gradient-to-r from-[#062015] via-[#0b2b1c] to-[#061a12] shadow-lg shadow-emerald-900/25 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.22),transparent_55%)]" />
                <span className="pointer-events-none absolute -inset-x-24 -top-8 h-24 rotate-12 bg-white/10 blur-xl translate-x-[-40%] group-hover:translate-x-[60%] transition-transform duration-700" />
                <span className="relative">Submit Review</span>
              </button>

              <button
                type="button"
                onClick={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  setShowPolicy(true);
                }}
                className="text-white/55 hover:text-white/80 text-xs sm:text-sm underline underline-offset-4"
              >
                Policy
              </button>
            </div>

            {/* Mobile/Tablet Exit */}
            <div className="md:hidden absolute bottom-20 sm:bottom-28 left-0 w-full flex justify-center px-3 sm:px-4 z-40">
              <button
                type="button"
                onClick={() => setExperience(false)}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950/80 backdrop-blur-xl px-4 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-xs text-white/80 hover:text-white hover:bg-zinc-900/80 border border-white/10 transition"
              >
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.6)]" />
                Exit Experience
              </button>
            </div>

            {/* scroll hint */}
            <div className="pointer-events-none absolute inset-x-0 bottom-32 sm:bottom-40 md:bottom-24 flex justify-center z-30">
              <div className="rounded-full bg-black px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-[11px] md:text-xs text-white/70">
                Scroll ↑↓ to rotate & reveal reviews
              </div>
            </div>

            {/* Desktop cards */}
            <div className="hidden sm:block">
              {cards.map(({ row, visible }, i) => (
                <div
                  key={i}
                  className={`absolute ${cornerPositions[i]} w-[240px] sm:w-[280px] md:w-[320px] lg:w-[340px] pointer-events-none`}
                >
                  <PopupReviewCard row={row} loading={loading} visible={visible} />
                </div>
              ))}
            </div>

            {/* ✅ Mobile bottom sheet (NO overlap): shows 1 active review + controls */}
            <div className="sm:hidden absolute inset-x-0 bottom-0 p-2 z-30">
              <div className="rounded-2xl bg-black/85 backdrop-blur-xl p-3 border border-white/10">
                {/* Top info row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-[11px] text-white/70">
                    Region: <span className="text-white/90">{currentRegion.label}</span>
                  </div>
                  <div className="text-[10px] text-white/50">Scroll ↑↓</div>
                </div>

                {/* Active review card */}
                <div className="relative">
                  <PopupReviewCard
                    row={mobileRow}
                    loading={loading}
                    visible={mobileVisible}
                    compact
                    interactive
                  />
                </div>

                {/* Controls */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileIndex((v) => Math.max(0, v - 1));
                    }}
                    disabled={mobileIndex === 0}
                    className="px-3 py-2 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-40 disabled:hover:bg-white/5"
                  >
                    ← Prev
                  </button>

                  <div className="text-[11px] text-white/60">
                    {mobileIndex + 1} / 4
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileIndex((v) => Math.min(3, v + 1));
                    }}
                    disabled={mobileIndex === 3}
                    className="px-3 py-2 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-40 disabled:hover:bg-white/5"
                  >
                    Next →
                  </button>
                </div>

                {/* Hint */}
                <div className="mt-2 text-[10px] text-white/45 leading-relaxed">
                  Tip: scroll to rotate globe. Reviews auto-change as you explore, or use Prev/Next.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backdrop for modals */}
        {(showPolicy || showForm) && <div className={`${modalKind} inset-0 z-40 bg-black/70`} />}

        {/* policy modal */}
        {showPolicy && (
          <div className={`${modalKind} inset-0 z-50 flex items-center justify-center p-3 sm:p-4`}>
            <div className="max-w-sm sm:max-w-md w-full bg-black rounded-xl sm:rounded-2xl p-5 sm:p-7 text-white shadow-2xl border border-white/10">
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Privacy Policy</h3>
              <p className="text-white/70 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                • Reviews may be shown publicly after approval. <br />
                • Abusive or spam content will be removed. <br />
                • Please avoid sharing sensitive info.
              </p>
              <button
                type="button"
                onClick={() => setShowPolicy(false)}
                className="w-full py-2 sm:py-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Review form modal (no page scrollbar; only internal if needed) */}
        {showForm && (
          <div className={`${modalKind} inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-8 sm:pt-10`}>
            <div className="w-full max-w-md sm:max-w-lg md:max-w-xl rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="bg-zinc-950 px-4 sm:px-6 py-4 sm:py-5 text-white">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold">Submit a Review</h3>
                    <p className="mt-1 text-xs sm:text-sm text-white/55">
                      Your review will be visible after moderation approval.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="shrink-0 rounded-full bg-white/5 hover:bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs text-white/80 border border-white/10 transition"
                  >
                    Close ✕
                  </button>
                </div>

                <div className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-white/60">
                  <span className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-white/5 border border-white/10 px-2 sm:px-3 py-1">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.6)]" />
                    Category: <span className="text-white/80">{category}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-white/5 border border-white/10 px-2 sm:px-3 py-1">
                    Country: <span className="text-white/80">{userCountry}</span>
                  </span>
                </div>
              </div>

              {/* Body */}
              <div
                className="bg-black px-4 sm:px-6 py-5 sm:py-6 text-white max-h-[65svh] sm:max-h-[70svh] overflow-auto"
                style={hideScrollbarStyle}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>

                {success ? (
                  <div className="text-center py-8 sm:py-10">
                    <div className="text-emerald-400 text-3xl sm:text-4xl mb-3 sm:mb-4">✓</div>
                    <div className="text-base sm:text-lg font-medium">Sent Successfully</div>
                    <p className="text-white/60 mt-1 sm:mt-2 text-xs sm:text-sm">
                      Awaiting moderation approval.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="space-y-4 sm:space-y-5">
                    {errorMsg && (
                      <div className="rounded-lg sm:rounded-xl bg-red-500/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-200 border border-red-500/20">
                        {errorMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[11px] sm:text-xs text-white/60">Full name</label>
                        <input
                          type="text"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-zinc-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 border border-white/5"
                          required
                        />
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <label className="text-[11px] sm:text-xs text-white/60">Email (required)</label>
                        <input
                          type="email"
                          placeholder="you@email.com"
                          value={reviewerEmail}
                          onChange={(e) => setReviewerEmail(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-zinc-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 border border-white/5"
                          required
                        />
                      </div>

                      <div className="space-y-1 sm:space-y-2 sm:col-span-2">
                        <label className="text-[11px] sm:text-xs text-white/60">Title</label>
                        <input
                          type="text"
                          placeholder="Short title for your review"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-zinc-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 border border-white/5"
                          required
                        />
                      </div>

                      <div className="space-y-1 sm:space-y-2 sm:col-span-2">
                        <label className="text-[11px] sm:text-xs text-white/60">Your feedback</label>
                        <textarea
                          placeholder="Tell us about your experience..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          rows={3}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-zinc-900 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none border border-white/5"
                          required
                        />
                      </div>
                    </div>

                    <div className="rounded-lg sm:rounded-2xl bg-zinc-950/70 border border-white/10 p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-medium">Rating</p>
                          <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">
                            Tap stars to rate (1 to 5).
                          </p>
                        </div>
                        <div className="flex gap-0.5 sm:gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setRating(n)}
                              className={`text-xl sm:text-2xl transition-transform active:scale-95 ${
                                n <= rating ? "text-yellow-400" : "text-zinc-700"
                              }`}
                              aria-label={`Rate ${n}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-0 sm:pt-1">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="relative overflow-hidden px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-black bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        {submitting ? "Sending..." : "Submit"}
                      </button>
                    </div>

                    <p className="text-[10px] sm:text-[11px] text-white/45 leading-relaxed">
                      By submitting, you agree your review may be displayed publicly after approval.
                      Abuse/spam will be removed.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────── */
/* POPUP REVIEW CARD */
/* ──────────────────────────────────────────────── */
function PopupReviewCard({
  row,
  loading,
  visible,
  compact = false,
  interactive = false,
}: {
  row?: ReviewRow;
  loading: boolean;
  visible: boolean;
  compact?: boolean;
  interactive?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const anim = visible
    ? "opacity-100 translate-y-0 scale-100"
    : "opacity-0 translate-y-6 scale-[0.985] pointer-events-none";

  const shell = compact
    ? "rounded-lg sm:rounded-2xl bg-black/80 backdrop-blur-xl p-3 sm:p-4 shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
    : "rounded-lg sm:rounded-2xl bg-black/70 backdrop-blur-xl p-4 sm:p-5 shadow-[0_10px_35px_rgba(0,0,0,0.55)]";

  if (loading) {
    return (
      <div className={`transition-all duration-700 ease-out transform ${anim}`}>
        <div className={shell}>
          <div className="h-3 sm:h-4 w-20 sm:w-24 bg-zinc-900 rounded mb-2 sm:mb-3 animate-pulse" />
          <div className="h-2 sm:h-3 w-full bg-zinc-900 rounded mb-1 sm:mb-2 animate-pulse" />
          <div className="h-2 sm:h-3 w-2/3 bg-zinc-900 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className={`transition-all duration-700 ease-out transform ${anim}`}>
        <div className={`${shell} text-white/60 text-[11px] sm:text-xs`}>
          No reviews found for this region yet.
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-700 ease-out transform ${anim}`}>
      <div className={shell}>
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {row.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.image}
                alt={row.display_name || "Avatar"}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-zinc-900 flex items-center justify-center text-white/85 text-[11px] sm:text-xs font-bold">
                {initials(row.display_name)}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-white text-xs sm:text-sm font-medium truncate">
                {row.title ?? "Client review"}
              </p>
              <p className="text-white/60 text-[11px] sm:text-xs">
                {row.country_code} · {row.category}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <Stars rating={row.rating} />
            <p className="mt-0.5 sm:mt-1 text-white/55 text-[11px] sm:text-xs">
              {new Date(row.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* ✅ Comment (safe on mobile) */}
        <div className="mt-1 sm:mt-2">
          <p
            className="text-white/75 text-[11px] sm:text-xs leading-relaxed"
            style={
              compact && !expanded
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {row.comment}
          </p>

          {/* Mobile-only expand */}
          {compact && interactive && row.comment?.length > 140 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-2 text-[11px] text-white/70 underline underline-offset-4 hover:text-white"
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>

        <div className="mt-2 sm:mt-3 flex items-center justify-end gap-1 sm:gap-2 text-[11px] sm:text-xs text-white/80">
          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#4aa3ff] shadow-[0_0_18px_rgba(74,163,255,0.6)]" />
          Verified - Client
        </div>
      </div>
    </div>
  );
}
