"use client";
import dynamic from 'next/dynamic';
import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./Navbar";
import Sections from "./Sections";
import ScrollCTA from "./ScrollCTA";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollCta, setShowScrollCta] = useState(false);
  const [navSolid, setNavSolid] = useState(false);

  const servicesBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileServicesBtnRef = useRef<HTMLButtonElement>(null);
  const mobileServicesPanelRef = useRef<HTMLDivElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const locoRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 420);
    return () => clearTimeout(timer);
  }, []);

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

      if (
        mobileServicesOpen &&
        mobileServicesBtnRef.current &&
        !mobileServicesBtnRef.current.contains(target) &&
        mobileServicesPanelRef.current &&
        !mobileServicesPanelRef.current.contains(target)
      ) {
        setMobileServicesOpen(false);
      }

      if (
        mobileOpen &&
        mobileBtnRef.current &&
        !mobileBtnRef.current.contains(target) &&
        mobilePanelRef.current &&
        !mobilePanelRef.current.contains(target)
      ) {
        setMobileOpen(false);
        setMobileServicesOpen(false);
      }
    };

    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setMobileServicesOpen(false);
        setMobileOpen(false);
      }
    };

    window.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEsc);

    return () => {
      window.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEsc);
    };
  }, [servicesOpen, mobileServicesOpen, mobileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initLocomotive = async () => {
      const LocomotiveScroll = (await import("locomotive-scroll")).default;

      const container = scrollContainerRef.current;
      if (!container) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Check if mobile to determine if we should lock overflow
      const isMobile = window.innerWidth <= 1024;

      const loco = new LocomotiveScroll({
        el: container,
        smooth: !prefersReducedMotion,
        lerp: 0.08,
        multiplier: 1,
        getSpeed: true,
        getDirection: true,
        reloadOnContextChange: true,
        smartphone: { smooth: false },
        tablet: { smooth: false },
      });

      locoRef.current = loco;

      // ✅ FIX: Only lock overflow on Desktop/Smooth mode.
      // On mobile, we need default overflow for native scrolling.
      if (!isMobile && !prefersReducedMotion) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      }

      loco.on("scroll", (instance: any) => {
        const scrollY = instance.scroll.y;
        setShowScrollCta(scrollY > 140);
        setNavSolid(scrollY > 18);
        ScrollTrigger.update();
      });

      // SCROLLER PROXY
      ScrollTrigger.scrollerProxy(container, {
        scrollTop(value) {
          if (loco.scroll && loco.scroll.instance) {
             if (typeof value === "number") {
                loco.scrollTo(value, { duration: 0, disableLerp: true });
             }
             return loco.scroll.instance.scroll.y;
          }
          return 0; // Fallback
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
        pinType: container.style.transform ? "transform" : "fixed",
      });

      // ✅ CRITICAL FIX: make ALL triggers use the locomotive scroller by default
      ScrollTrigger.defaults({ scroller: container });

      // refresh flow
      setTimeout(() => {
        loco.update();
        ScrollTrigger.refresh();
      }, 200);
    };

    initLocomotive();

    return () => {
      locoRef.current?.destroy();
      locoRef.current = null;
      // Reset overflow on unmount
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

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
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        mobileBtnRef={mobileBtnRef}
        mobilePanelRef={mobilePanelRef}
        mobileServicesOpen={mobileServicesOpen}
        setMobileServicesOpen={setMobileServicesOpen}
        mobileServicesBtnRef={mobileServicesBtnRef}
        mobileServicesPanelRef={mobileServicesPanelRef}
      />

      <div ref={scrollContainerRef} data-scroll-container className="will-change-transform">
        <Sections loaded={loaded} />

        <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row">
            <span>© {year} XOVATO. All rights reserved.</span>
            <span className="text-white/50">build With XOVATO Tech With Love </span>
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
           html, body {
             overflow-y: auto !important;
             overflow-x: hidden !important;
             height: auto !important;
             position: static !important;
           }
           /* Ensure container doesn't block scroll */
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