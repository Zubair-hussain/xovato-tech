"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./Navbar";
import Sections from "./Sections";
import ScrollCTA from "./ScrollCTA";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);

  // Desktop services dropdown state (Navbar expects these)
  const [servicesOpen, setServicesOpen] = useState(false);
  const [showScrollCta, setShowScrollCta] = useState(false);
  const [navSolid, setNavSolid] = useState(false);

  const servicesBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const locoRef = useRef<any>(null);

  // ✅ Track scrollY ourselves to avoid `loco.scroll` typings
  const scrollYRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 420);
    return () => clearTimeout(timer);
  }, []);

  // Close desktop dropdown on outside / esc
  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        servicesOpen &&
        servicesBtnRef.current &&
        !servicesBtnRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setServicesOpen(false);
      }
    };

    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setServicesOpen(false);
    };

    window.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEsc);

    return () => {
      window.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEsc);
    };
  }, [servicesOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initLocomotive = async () => {
      const LocomotiveScroll = (await import("locomotive-scroll")).default;

      const container = scrollContainerRef.current;
      if (!container) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const isMobile = window.innerWidth <= 1024;

      // ✅ Smooth only on desktop + no-reduced-motion
      const smoothEnabled = !prefersReducedMotion && !isMobile;

      const loco = new LocomotiveScroll({
        el: container,
        smooth: smoothEnabled,
        lerp: 0.08,
        multiplier: 1,
        getSpeed: true,
        getDirection: true,
        reloadOnContextChange: true,
      });

      locoRef.current = loco;

      // ✅ Only lock overflow when smooth is enabled (desktop)
      if (smoothEnabled) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }

      // ✅ Update refs + UI states
      loco.on("scroll", (instance: any) => {
        const y = instance?.scroll?.y ?? 0;
        scrollYRef.current = y;

        setShowScrollCta(y > 140);
        setNavSolid(y > 18);

        ScrollTrigger.update();
      });

      // ✅ Scroller proxy WITHOUT touching `loco.scroll`
      ScrollTrigger.scrollerProxy(container, {
        scrollTop(value) {
          if (typeof value === "number") {
            loco.scrollTo(value, { duration: 0, disableLerp: true });
          }
          return scrollYRef.current;
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        },
        pinType: container.style.transform ? "transform" : "fixed",
      });

      // ✅ Make all ScrollTriggers use locomotive container
      ScrollTrigger.defaults({ scroller: container });

      // Refresh flow
      setTimeout(() => {
        loco.update();
        ScrollTrigger.refresh();
      }, 200);
    };

    initLocomotive();

    return () => {
      locoRef.current?.destroy();
      locoRef.current = null;

      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Force update after load
  useEffect(() => {
    if (!loaded || !locoRef.current) return;

    const forceUpdate = () => {
      locoRef.current?.update();
      ScrollTrigger.refresh();
      window.dispatchEvent(new Event("resize"));
    };

    const timers = [
      setTimeout(forceUpdate, 600),
      setTimeout(forceUpdate, 1200),
      setTimeout(forceUpdate, 1800),
    ];

    return () => timers.forEach(clearTimeout);
  }, [loaded]);

  useEffect(() => {
    const onResize = () => {
      locoRef.current?.update();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="relative min-h-screen bg-black text-white">
      <Navbar
        navSolid={navSolid}
        servicesOpen={servicesOpen}
        setServicesOpen={setServicesOpen}
        servicesBtnRef={servicesBtnRef}
        panelRef={panelRef}
      />

      <div
        ref={scrollContainerRef}
        data-scroll-container
        className="will-change-transform"
      >
        <Sections loaded={loaded} />

        <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row">
            <span>© {year} XOVATO. All rights reserved.</span>
            <span className="text-white/50">build With XOVATO Tech With Love</span>
          </div>
        </footer>
      </div>

      <ScrollCTA show={showScrollCta} />

      <style jsx global>{`
        /* DESKTOP: Apply Locomotive Fixed styles */
        @media (min-width: 1025px) {
          html.has-scroll-smooth {
            position: fixed !important;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            overflow: hidden;
          }

          html.has-scroll-smooth body {
            position: fixed;
            width: 100%;
            overflow: hidden;
          }
        }

        /* MOBILE/TABLET: Force Native Scrolling */
        @media (max-width: 1024px) {
          html,
          body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            height: auto !important;
            position: static !important;
          }

          [data-scroll-container] {
            overflow-y: visible !important;
            transform: none !important;
          }
        }

        [data-scroll-container] {
          width: 100%;
          min-height: 100vh;
          background: #000;
        }

        body {
          background: #000;
        }
      `}</style>
    </div>
  );
}
