"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  brand?: string; // defaults to "Xovato"
  oncePerSession?: boolean; // default true
};

export default function IntroSplash({
  brand = "Xovato",
  oncePerSession = true,
}: Props) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"idle" | "frame" | "x" | "word" | "out">(
    "idle"
  );

  // ✅ StrictMode-safe
  const didInitRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (oncePerSession) {
      const seen = sessionStorage.getItem("intro_seen");
      if (seen === "1") return;
      sessionStorage.setItem("intro_seen", "1");
    }

    setShow(true);
    setPhase("frame");

    const t1 = window.setTimeout(() => setPhase("x"), 650);
    const t2 = window.setTimeout(() => setPhase("word"), 1150);
    const t3 = window.setTimeout(() => setPhase("out"), 2200);
    const t4 = window.setTimeout(() => setShow(false), 2800);

    timersRef.current.push(t1, t2, t3, t4);

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [oncePerSession]);

  if (!show) return null;

  const firstLetter = brand.slice(0, 1);
  const rest = brand.slice(1);

  return (
    <div
      className={[
        "fixed inset-0 z-[99999]",
        "flex items-center justify-center",
        "bg-black",
        "px-4", // ✅ keeps safe padding on small screens
        phase === "out" ? "intro-fade-out" : "",
      ].join(" ")}
      aria-hidden="true"
    >
      {/* ✅ background glow - safe on mobile */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-[42%] h-[55vmin] w-[55vmin] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {/* ✅ content wrapper scales responsively */}
      <div className="relative flex flex-col items-center text-center">
        {/* Box + X */}
        <div
          className={[
            "relative grid place-items-center",
            // ✅ responsive size
            "h-[92px] w-[92px]",
            "sm:h-[110px] sm:w-[110px]",
            "md:h-[132px] md:w-[132px]",
          ].join(" ")}
        >
          {/* animated frame */}
          <div
            className={[
              "intro-frame",
              phase !== "idle" ? "intro-frame-on" : "",
            ].join(" ")}
          />

          {/* X draw */}
          <svg
            className={[
              "intro-x",
              phase === "x" || phase === "word" || phase === "out"
                ? "intro-x-on"
                : "",
            ].join(" ")}
            viewBox="0 0 100 100"
            fill="none"
          >
            <defs>
              <linearGradient id="xg" x1="10" y1="10" x2="90" y2="90">
                <stop stopColor="#10b981" />
                <stop offset="0.55" stopColor="#22d3ee" />
                <stop offset="1" stopColor="#10b981" />
              </linearGradient>
            </defs>

            <path
              className="intro-stroke"
              d="M22 22 L78 78"
              stroke="url(#xg)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              className="intro-stroke"
              d="M78 22 L22 78"
              stroke="url(#xg)"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Word reveal */}
        <div className="mt-5 flex items-baseline justify-center gap-1">
          <span className="text-white/92 font-extrabold tracking-tight text-4xl sm:text-5xl md:text-6xl">
            {firstLetter}
          </span>

          <span
            className={[
              "intro-word",
              phase === "word" || phase === "out" ? "intro-word-on" : "",
            ].join(" ")}
          >
            {rest}
          </span>
        </div>

        {/* subtitle */}
        <div
          className={[
            "mt-2 uppercase tracking-[0.22em] text-white/55",
            "text-[10px] sm:text-xs md:text-sm",
            phase === "word" || phase === "out" ? "intro-sub-on" : "intro-sub",
          ].join(" ")}
        >
          Tech
        </div>

        {/* tiny hint for very small screens */}
        <div className="mt-4 text-[10px] sm:hidden text-white/35">
          Loading experience…
        </div>
      </div>

      <style jsx>{`
        /* ====== OUTRO ====== */
        .intro-fade-out {
          animation: introFadeOut 600ms ease forwards;
        }
        @keyframes introFadeOut {
          to {
            opacity: 0;
            transform: scale(0.985);
          }
        }

        /* ====== FRAME (responsive inset) ====== */
        .intro-frame {
          position: absolute;
          inset: -10px; /* default mobile inset */
          border-radius: 22px;
          opacity: 0;
        }
        @media (min-width: 640px) {
          .intro-frame {
            inset: -12px;
            border-radius: 26px;
          }
        }
        @media (min-width: 768px) {
          .intro-frame {
            inset: -14px;
            border-radius: 30px;
          }
        }

        .intro-frame-on {
          opacity: 1;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.03)
          );
          box-shadow: 0 26px 85px rgba(0, 0, 0, 0.7),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.12);
          animation: framePop 650ms cubic-bezier(0.2, 1, 0.2, 1) forwards;
        }

        @keyframes framePop {
          from {
            transform: scale(0.92);
            filter: blur(4px);
          }
          to {
            transform: scale(1);
            filter: blur(0px);
          }
        }

        /* ====== X ====== */
        .intro-x {
          width: 100%;
          height: 100%;
          opacity: 0;
          filter: drop-shadow(0 0 18px rgba(16, 185, 129, 0.22));
        }
        .intro-x-on {
          opacity: 1;
        }
        .intro-stroke {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
        }
        .intro-x-on .intro-stroke {
          animation: draw 520ms ease forwards;
        }
        .intro-x-on .intro-stroke:nth-child(2) {
          animation-delay: 90ms;
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* ====== WORD ====== */
        .intro-word {
          display: inline-block;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
          color: rgba(255, 255, 255, 0.92);

          /* responsive font */
          font-size: 2.25rem;
        }
        @media (min-width: 640px) {
          .intro-word {
            font-size: 3rem;
          }
        }
        @media (min-width: 768px) {
          .intro-word {
            font-size: 3.75rem;
          }
        }

        .intro-word {
          opacity: 0;
          transform: translateX(-10px);
          filter: blur(6px);
        }
        .intro-word-on {
          animation: wordIn 560ms cubic-bezier(0.2, 1, 0.2, 1) forwards;
        }
        @keyframes wordIn {
          to {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
          }
        }

        .intro-sub {
          opacity: 0;
          transform: translateY(6px);
          filter: blur(6px);
        }
        .intro-sub-on {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
          transition: all 420ms ease;
        }

        /* ✅ Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .intro-fade-out,
          .intro-frame-on,
          .intro-x-on .intro-stroke,
          .intro-word-on {
            animation: none !important;
          }
          .intro-frame,
          .intro-x,
          .intro-word,
          .intro-sub {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </div>
  );
}
