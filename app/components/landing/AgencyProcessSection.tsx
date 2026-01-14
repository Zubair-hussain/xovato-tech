// app/components/landing/AgencyProcessSection.tsx
"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ─────────────────────────────────────────────────────────────── */
/* DATA */
/* ─────────────────────────────────────────────────────────────── */
type Step = {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  label?: string;
};

const STEPS: Step[] = [
  {
    title: "We Start With Clarity, Not Assumptions",
    body:
      "Before writing a single line of code or designing an interface, we focus on understanding the real problem. We break down your idea into clear goals, user flows, and technical boundaries. This prevents over-engineering, misalignment, and wasted time—so every decision has purpose from day one.",
    imageSrc: "/image-G-01.png",
    imageAlt: "Discovery and clarity session",
    label: "FOCUS",
  },
  {
    title: "Design & Development Move Together",
    body:
      "We don’t design in isolation and we don’t develop blindly. UI/UX, frontend, backend, and performance are handled in parallel—so what you see is always build-ready and scalable. This approach allows faster feedback, cleaner architecture, and fewer surprises during delivery.",
    imageSrc: "/image-G-02.png",
    imageAlt: "Design and development collaboration",
    label: "DEVELOP",
  },
  {
    title: "Progress Is Visible, Not Hidden",
    body:
      "Instead of disappearing for weeks, we share progress in clear stages—working previews, demos, and real builds you can interact with. This keeps you involved, confident, and in control. By the time we launch, there are no surprises—only refinement.",
    imageSrc: "/image-G03.png",
    imageAlt: "Transparent progress and demos",
    label: "VISIBLE",
  },
];

/* ─────────────────────────────────────────────────────────────── */
/* Pixel Hover Overlay (NO swap / NO hide) */
/* ─────────────────────────────────────────────────────────────── */
function PixelHoverImage({
  src,
  alt,
  label = "Lorem",
  gridSize = 8,
  pixelColor = "rgba(16,185,129,0.95)",
}: {
  src: string;
  alt: string;
  label?: string;
  gridSize?: number;
  pixelColor?: string;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsTouch(
      "ontouchstart" in window ||
        (navigator.maxTouchPoints ?? 0) > 0 ||
        window.matchMedia?.("(pointer: coarse)")?.matches
    );
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    grid.innerHTML = "";
    const size = 100 / gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const px = document.createElement("div");
        px.className = "px-cell";
        px.style.position = "absolute";
        px.style.left = `${c * size}%`;
        px.style.top = `${r * size}%`;
        px.style.width = `${size}%`;
        px.style.height = `${size}%`;
        px.style.background = pixelColor;
        px.style.opacity = "0";
        grid.appendChild(px);
      }
    }
  }, [gridSize, pixelColor]);

  const animate = (show: boolean) => {
    const grid = gridRef.current;
    if (!grid) return;
    const pixels = grid.querySelectorAll<HTMLDivElement>(".px-cell");
    if (!pixels.length) return;

    gsap.killTweensOf(pixels);
    gsap.to(pixels, {
      opacity: show ? 1 : 0,
      duration: 0.22,
      stagger: { each: 0.012, from: "random" },
      overwrite: true,
    });
  };

  const onEnter = () => animate(true);
  const onLeave = () => animate(false);
  const onClick = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const first = grid.querySelector<HTMLDivElement>(".px-cell");
    const visible = first ? Number(getComputedStyle(first).opacity) > 0.1 : false;
    animate(!visible);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
      onMouseEnter={!isTouch ? onEnter : undefined}
      onMouseLeave={!isTouch ? onLeave : undefined}
      onClick={isTouch ? onClick : undefined}
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[4/3]">
        <Image src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </div>

      {/* one-word text INSIDE image */}
      <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
        <span
          className="
            rounded-full border border-white/15 bg-black/35
            px-4 py-2
            text-white/95 font-semibold uppercase tracking-[0.22em]
            text-sm sm:text-base md:text-lg
            backdrop-blur-md
          "
          style={{ textShadow: "0 10px 28px rgba(0,0,0,0.65)" }}
        >
          {label}
        </span>
      </div>

      {/* pixel overlay */}
      <div ref={gridRef} className="pointer-events-none absolute inset-0 z-20" />
      <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-tr from-transparent via-transparent to-white/10" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Spotlight Card */
/* ─────────────────────────────────────────────────────────────── */
function SpotlightCard({
  children,
  spotlightColor = "rgba(16,185,129,0.32)",
  className = "",
}: {
  children: React.ReactNode;
  spotlightColor?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(0.7)}
      onMouseLeave={() => setOpacity(0)}
      className={[
        "group relative overflow-hidden rounded-3xl",
        "border border-white/10 bg-white/[0.04] backdrop-blur-sm",
        "p-6 sm:p-7 md:p-8 lg:p-9",
        "transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
        "hover:border-emerald-500/40",
        className,
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700 ease-out"
        style={{
          opacity,
          background: `radial-gradient(circle 900px at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 z-0 h-72 w-72 rounded-full bg-emerald-600/10 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* Center Path */
/* ─────────────────────────────────────────────────────────────── */
function CenterPath() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden md:block">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-500/25 to-transparent" />
      <div className="absolute left-1/2 top-0 h-full w-[10px] -translate-x-1/2 blur-xl bg-emerald-500/10" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* MAIN */
/* ─────────────────────────────────────────────────────────────── */
export default function AgencyProcessSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const steps = useMemo(() => STEPS, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReduced) return;

    const header = section.querySelector<HTMLElement>("[data-reveal='header']");
    const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-reveal='card']"));

    const revealAll = () => {
      if (header) gsap.set(header, { autoAlpha: 1, y: 0, clearProps: "transform" });
      cards.forEach((c) => {
        gsap.set(c, { autoAlpha: 1, y: 0, clearProps: "transform" });
        c.querySelectorAll("[data-reveal-child]").forEach((child) => {
          gsap.set(child, { autoAlpha: 1, y: 0, scale: 1, clearProps: "transform" });
        });
      });
    };

    const ctx = gsap.context(() => {
      // IMPORTANT: we DO NOT gsap.set(autoAlpha:0) here.
      // We animate with immediateRender:false so nothing becomes invisible on refresh.

      if (header) {
        gsap.fromTo(
          header,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: header,
              start: "top 85%",
              once: true,
            },
          }
        );
      }

      cards.forEach((card) => {
        const img = card.querySelector<HTMLElement>("[data-reveal-child='img']");
        const text = card.querySelector<HTMLElement>("[data-reveal-child='text']");
        const dot = card.querySelector<HTMLElement>("[data-dot]");

        gsap.fromTo(
          card,
          { autoAlpha: 0, y: 44 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              once: true,
            },
          }
        );

        if (img) {
          gsap.fromTo(
            img,
            { autoAlpha: 0, y: 24, scale: 0.97 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.95,
              ease: "back.out(1.25)",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                start: "top 82%",
                once: true,
              },
            }
          );
        }

        if (text) {
          gsap.fromTo(
            text,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.85,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                start: "top 82%",
                once: true,
              },
            }
          );
        }

        if (dot) {
          gsap.fromTo(
            dot,
            { autoAlpha: 0, scale: 0.6 },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.65,
              ease: "back.out(1.7)",
              immediateRender: false,
              scrollTrigger: {
                trigger: card,
                start: "top 82%",
                once: true,
              },
            }
          );
        }
      });

      // refresh (helps after reload)
      ScrollTrigger.refresh();
    }, section);

    // Hard safety (always runs): if something fails, force visible.
    const safety = window.setTimeout(() => {
      revealAll();
      try {
        ScrollTrigger.refresh(true);
      } catch {}
    }, 900);

    return () => {
      window.clearTimeout(safety);
      ctx.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="w-full bg-black py-16 sm:py-20 md:py-24 lg:py-32 text-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          data-reveal="header"
          className="mx-auto max-w-3xl text-center mb-14 sm:mb-16 md:mb-20 lg:mb-24"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
            How We Actually Build &amp; Deliver
            <br className="hidden sm:inline" /> Digital Products
          </h2>
          <p className="mt-5 text-lg sm:text-xl text-white/70 leading-relaxed">
            A clear, transparent process that clients understand and trust.
          </p>
        </div>

        {/* Cards + Path */}
        <div className="relative">
          <CenterPath />

          <div className="space-y-10 md:space-y-14 lg:space-y-16">
            {steps.map((step, idx) => {
              const isEven = idx % 2 === 1;

              return (
                <div key={step.title} data-reveal="card" className="relative">
                  {/* Center dot aligned to path (md+) */}
                  <div
                    data-dot
                    className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                    style={{ transformOrigin: "center" }}
                  >
                    <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.45)]" />
                  </div>

                  <SpotlightCard>
                    <div
                      className={[
                        "flex flex-col gap-8 md:gap-10 lg:gap-12 items-center",
                        isEven ? "md:flex-row-reverse" : "md:flex-row",
                      ].join(" ")}
                    >
                      {/* Image */}
                      <div data-reveal-child="img" className="w-full md:w-1/2">
                        <PixelHoverImage src={step.imageSrc} alt={step.imageAlt} label={step.label ?? "Lorem"} />
                      </div>

                      {/* Text */}
                      <div data-reveal-child="text" className="w-full md:w-1/2 space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-300">
                          Step {idx + 1}
                        </div>

                        <h3 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold tracking-tight leading-tight">
                          {step.title}
                        </h3>

                        <p className="text-base sm:text-lg text-white/75 leading-relaxed">{step.body}</p>
                      </div>
                    </div>
                  </SpotlightCard>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
