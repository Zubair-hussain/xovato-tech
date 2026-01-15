"use client";

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { cn } from "../../lib/cn";
import * as THREE from "three";

// ✅ Using your specific wrapper path as requested
import { EffectComposer, RenderPass, UnrealBloomPass } from "../../lib/threePostprocessing";

import { playfair } from "@/app/fonts";
import { useTranslation } from "react-i18next";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import GlobeReviewsWidget from "./GlobeReviewsWidget";
import AgencyProcessSection from "./AgencyProcessSection";

/* ------------------------- GSAP REGISTER (SAFE) ------------------------- */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ------------------------- CONSTANTS & DATA ------------------------- */
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80";

const MENU_ITEMS = [
  {
    title: "Transparency",
    paragraph:
      "Clear communication and honest work come first. Every project is handled responsibly, with full transparency and attention to detail. What's promised is what gets delivered.",
    images: [
      "https://images.unsplash.com/photo-1521791136064-7985c2d18854?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80",
    ],
    link: "#transparency",
  },
  {
    title: "Clarity",
    paragraph:
      "Your ideas and time are valued. Every decision is made thoughtfully, feedback is taken seriously, and collaboration stays professional from start to finish.",
    images: [
      "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1455849318743-b2233052fcff?auto=format&fit=crop&w=600&q=80",
    ],
    link: "#clarity",
  },
  {
    title: "Momentum",
    paragraph:
      "Work moves quickly without cutting corners. Processes are streamlined, timelines are realistic, and progress stays consistent so results arrive on time.",
    images: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1518600506278-4e8ef466b810?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1502086223501-681a91e9b08b?auto=format&fit=crop&w=600&q=80",
    ],
    link: "#momentum",
  },
];

/* ------------------------- HELPER COMPONENT: IMAGE PILL ------------------------- */
const ImagePill = ({ src, fallback }: { src: string; fallback: string }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <div
      className="
        relative overflow-hidden
        bg-black/20 rounded-full
        mx-4 sm:mx-6 md:mx-8
        w-16 h-8 sm:w-24 sm:h-11 md:w-32 md:h-14
        flex-shrink-0
      "
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt="topic"
        onError={() => setImgSrc(fallback)}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

/* ------------------------- ShinyText ------------------------- */
interface ShinyTextProps {
  text: string;
  className?: string;
  speedMs?: number;
  pauseOnHover?: boolean;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  className = "",
  speedMs = 1600,
  pauseOnHover = true,
}) => {
  return (
    <span
      className={`shinyText ${pauseOnHover ? "shinyPause" : ""} ${className}`}
      style={{ ["--shine-speed" as any]: `${speedMs}ms` }}
    >
      {text}
      <style jsx>{`
        .shinyText {
          display: inline-block;
          color: rgba(255, 255, 255, 0.92);
          background-image: linear-gradient(
            110deg,
            rgba(255, 255, 255, 0.35) 0%,
            rgba(255, 255, 255, 0.35) 35%,
            rgba(255, 255, 255, 1) 50%,
            rgba(255, 255, 255, 0.35) 65%,
            rgba(255, 255, 255, 0.35) 100%
          );
          background-size: 220% 100%;
          background-position: 120% 0;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine var(--shine-speed, 1600ms) linear infinite;
          will-change: background-position;
        }
        @keyframes shine {
          0% {
            background-position: 120% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }
        .shinyPause:hover {
          animation-play-state: paused;
        }
      `}</style>
    </span>
  );
};

/* ------------------------- 3D Rings ------------------------- */
function Rings3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef(false);
  const prevX = useRef(0);
  const prevY = useRef(0);

  const rotationXTarget = useRef(15);
  const rotationYTarget = useRef(0);
  const rotationX = useRef(15);
  const rotationY = useRef(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const hoveredRing = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 1.0, 0.4, 0.85));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 10);
    pointLight.position.set(-1, 1, 3);
    scene.add(pointLight);

    const group = new THREE.Group();
    group.rotation.order = "YXZ";
    scene.add(group);

    const bw_unit = 0.22;
    const green = new THREE.Color(0x10b981);
    const darkGreen = new THREE.Color(0x064f3a);

    const borderMatA = new THREE.MeshStandardMaterial({
      color: green,
      transparent: true,
      opacity: 0.92,
      roughness: 0.12,
      metalness: 0.9,
      emissive: green,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    });

    const radiusA = 1.9;
    const innerA = radiusA - bw_unit;
    const ringBorderA = new THREE.Mesh(new THREE.RingGeometry(innerA, radiusA, 256), borderMatA);
    const ringGroupA = new THREE.Group();
    ringGroupA.add(ringBorderA);
    ringGroupA.rotation.x = (70 * Math.PI) / 180;
    ringGroupA.rotation.z = (18 * Math.PI) / 180;
    group.add(ringGroupA);

    const radiusB = 1.45;
    const innerB = radiusB - bw_unit;
    const borderMatB = borderMatA.clone();
    borderMatB.opacity = 0.98;
    borderMatB.emissiveIntensity = 0.4;
    const ringBorderB = new THREE.Mesh(new THREE.RingGeometry(innerB, radiusB, 256), borderMatB);
    const ringGroupB = new THREE.Group();
    ringGroupB.add(ringBorderB);
    ringGroupB.rotation.x = (70 * Math.PI) / 180;
    ringGroupB.rotation.z = (72 * Math.PI) / 180;
    group.add(ringGroupB);

    const radiusC = 0.9;
    const innerC = radiusC - bw_unit;
    const borderMatC = borderMatA.clone();
    borderMatC.opacity = 0.82;
    borderMatC.emissiveIntensity = 0.3;
    const ringBorderC = new THREE.Mesh(new THREE.RingGeometry(innerC, radiusC, 256), borderMatC);
    const ringGroupC = new THREE.Group();
    ringGroupC.add(ringBorderC);
    ringGroupC.rotation.x = (70 * Math.PI) / 180;
    ringGroupC.rotation.z = (-8 * Math.PI) / 180;
    group.add(ringGroupC);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 32),
      new THREE.MeshBasicMaterial({
        color: green,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.08;
    group.add(floor);

    const ballRadius = 0.38;
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius, 64, 64),
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.95,
        roughness: 0.3,
        metalness: 0.8,
        emissive: darkGreen,
        emissiveIntensity: 0.2,
      })
    );
    scene.add(ball);

    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(ballRadius * 1.4, 32, 32),
      new THREE.MeshBasicMaterial({
        color: green,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ball.add(aura);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([ringGroupA, ringGroupB, ringGroupC], true);
      const hitGroup = intersects.length > 0 ? (intersects[0].object.parent as THREE.Group) : null;

      if (hitGroup !== hoveredRing.current) {
        if (hoveredRing.current) {
          const oldMesh = hoveredRing.current.children[0] as THREE.Mesh;
          const oldMat = oldMesh.material as THREE.MeshStandardMaterial;
          gsap.to(hoveredRing.current.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" });
          gsap.to(oldMat, { emissiveIntensity: 0.35, duration: 0.5 });
        }

        if (hitGroup) {
          hoveredRing.current = hitGroup;
          const newMesh = hitGroup.children[0] as THREE.Mesh;
          const newMat = newMesh.material as THREE.MeshStandardMaterial;
          gsap.to(hitGroup.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.5, ease: "back.out(1.7)" });
          gsap.to(newMat, { emissiveIntensity: 1.2, duration: 0.5 });
          container.style.cursor = "pointer";
        } else {
          hoveredRing.current = null;
          container.style.cursor = "grab";
        }
      }
    };

    container.addEventListener("mousemove", onMouseMove);

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      composer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      ringGroupA.rotation.y += ((2 * Math.PI) / 8.2) * delta;
      ringGroupB.rotation.y -= ((2 * Math.PI) / 9.6) * delta;
      ringGroupC.rotation.y += ((2 * Math.PI) / 11.8) * delta * -1;

      const period = 4.6;
      const cos = Math.cos((2 * Math.PI * time) / period);

      const scaleCore = 1.0325 - 0.0325 * cos;
      ball.scale.set(scaleCore, scaleCore, scaleCore);

      const scaleGlow = 1.01 - 0.09 * cos;
      aura.scale.set(scaleGlow, scaleGlow, scaleGlow);

      (aura.material as THREE.MeshBasicMaterial).opacity = 0.735 - 0.185 * cos;

      rotationX.current += (rotationXTarget.current - rotationX.current) * 0.25;
      rotationY.current += (rotationYTarget.current - rotationY.current) * 0.25;
      group.rotation.x = (rotationX.current * Math.PI) / 180;
      group.rotation.y = (rotationY.current * Math.PI) / 180;

      composer.render();
    };
    animate();

    const handleStart = (clientX: number, clientY: number) => {
      isDragging.current = true;
      prevX.current = clientX;
      prevY.current = clientY;
      container.style.cursor = "grabbing";
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current) return;
      const deltaX = clientX - prevX.current;
      const deltaY = clientY - prevY.current;
      prevX.current = clientX;
      prevY.current = clientY;
      rotationYTarget.current += deltaX * 0.5;
      rotationXTarget.current -= deltaY * 0.5;
    };

    const handleEnd = () => {
      isDragging.current = false;
      container.style.cursor = "grab";
    };

    const onMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMoveDrag = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
      onMouseMove(e);
    };
    const onMouseUp = () => handleEnd();

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - touchStartX.current;
      const dy = y - touchStartY.current;

      // allow vertical scroll
      if (Math.abs(dy) > Math.abs(dx)) {
        prevX.current = x;
        prevY.current = y;
        return;
      }

      handleMove(x, y);
      if (e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => handleEnd();

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMoveDrag);
    window.addEventListener("mouseup", onMouseUp);

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(raf);

      container.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);

      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMoveDrag);
      window.removeEventListener("mouseup", onMouseUp);

      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);

      composer.dispose();
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] md:h-[420px] md:w-[420px]"
    />
  );
}

/* ------------------------- MENU ITEM COMPONENT ------------------------- */
const MenuItem = ({
  title,
  paragraph,
  images,
  link,
  isFirst,
}: {
  title: string;
  paragraph: string;
  images: string[];
  link: string;
  isFirst: boolean;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);

  const loopRef = useRef<gsap.core.Tween | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [repetitions, setRepetitions] = useState(2);

  const segments = useMemo(() => {
    return paragraph
      .split(".")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [paragraph]);

  const isTouchRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    isTouchRef.current =
      "ontouchstart" in window ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      window.matchMedia?.("(hover: none)").matches;
  }, []);

  const findClosestEdge = (
    mouseX: number,
    mouseY: number,
    width: number,
    height: number
  ): "top" | "bottom" => {
    const topEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY, 2);
    const bottomEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY - height, 2);
    return topEdgeDist < bottomEdgeDist ? "top" : "bottom";
  };

  useLayoutEffect(() => {
    const calc = () => {
      const inner = marqueeInnerRef.current;
      if (!inner) return;
      const part = inner.querySelector(".marquee-part") as HTMLElement | null;
      if (!part) return;

      const w = part.offsetWidth || 1;
      const needed = Math.ceil(window.innerWidth / w) + 2;
      setRepetitions(Math.max(2, needed));
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [title, paragraph, images]);

  useLayoutEffect(() => {
    const overlay = marqueeRef.current;
    const inner = marqueeInnerRef.current;
    if (!overlay || !inner) return;

    const setup = () => {
      const part = inner.querySelector(".marquee-part") as HTMLElement | null;
      if (!part) return;

      const contentWidth = part.offsetWidth;
      if (!contentWidth) return;

      loopRef.current?.kill();

      gsap.set(overlay, { y: "101%", autoAlpha: 0 });
      gsap.set(inner, { x: 0, y: 0 });

      const duration = Math.max(20, contentWidth / 100);

      loopRef.current = gsap.to(inner, {
        x: -contentWidth,
        duration,
        ease: "none",
        repeat: -1,
        paused: true,
      });
    };

    const t = window.setTimeout(setup, 100);
    return () => {
      window.clearTimeout(t);
      loopRef.current?.kill();
      loopRef.current = null;
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [title, paragraph, images, repetitions]);

  const showOverlay = (edge: "top" | "bottom") => {
    const overlay = marqueeRef.current;
    const inner = marqueeInnerRef.current;
    if (!overlay || !inner) return;

    tlRef.current?.kill();
    tlRef.current = gsap.timeline({ defaults: { duration: 0.55, ease: "expo.out" } });

    tlRef.current
      .set(overlay, { autoAlpha: 1 }, 0)
      .set(overlay, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .set(inner, { y: edge === "top" ? "101%" : "-101%" }, 0)
      .to([overlay, inner], { y: "0%", overwrite: "auto" }, 0);

    loopRef.current?.play(0);
  };

  const hideOverlay = (edge: "top" | "bottom") => {
    const overlay = marqueeRef.current;
    const inner = marqueeInnerRef.current;
    if (!overlay || !inner) return;

    loopRef.current?.pause();

    tlRef.current?.kill();
    tlRef.current = gsap.timeline({
      defaults: { duration: 0.28, ease: "power3.in" },
      onComplete: () => {
        gsap.set(overlay, { autoAlpha: 0, y: "101%" });
        gsap.set(inner, { x: 0, y: 0 });
        loopRef.current?.pause(0);
      },
    });

    tlRef.current
      .to(overlay, { y: edge === "top" ? "-101%" : "101%", overwrite: "auto" }, 0)
      .to(inner, { y: edge === "top" ? "101%" : "-101%", overwrite: "auto" }, 0);
  };

  const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (isTouchRef.current) return;
    const item = itemRef.current;
    if (!item) return;
    const rect = item.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    showOverlay(edge);
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (isTouchRef.current) return;
    const item = itemRef.current;
    if (!item) return;
    const rect = item.getBoundingClientRect();
    const edge = findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
    hideOverlay(edge);
  };

  useEffect(() => {
    const onScroll = () => {
      if (isTouchRef.current) return;
      const overlay = marqueeRef.current;
      if (!overlay) return;
      const visible = gsap.getProperty(overlay, "autoAlpha") as number;
      if (visible > 0.01) {
        loopRef.current?.pause(0);
        gsap.set(overlay, { autoAlpha: 0, y: "101%" });
        if (marqueeInnerRef.current) gsap.set(marqueeInnerRef.current, { x: 0, y: 0 });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={itemRef}
      className="relative overflow-hidden"
      style={{ borderTop: isFirst ? "none" : "1px solid rgba(255,255,255,0.1)" }}
    >
      <a
        href={link}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative z-10 block no-underline cursor-pointer px-4 py-6 sm:px-5 sm:py-7 md:px-4 md:py-8"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <span
              className="font-syne font-bold uppercase tracking-tight text-white text-2xl sm:text-3xl md:text-5xl leading-[1.05]"
              style={{ wordBreak: "break-word" }}
            >
              {title}
            </span>
            <span className="text-emerald-400 text-lg sm:text-xl md:text-2xl shrink-0">↗</span>
          </div>
          <p className="text-xs sm:text-sm text-white/60 font-light max-w-[40rem] leading-relaxed">
            {paragraph}
          </p>
        </div>
      </a>

      <div
        ref={marqueeRef}
        className="absolute inset-0 bg-emerald-500 pointer-events-none translate-y-[101%] z-20"
        style={{ willChange: "transform, opacity" }}
      >
        <div
          ref={marqueeInnerRef}
          className="h-full w-fit flex items-center whitespace-nowrap"
          style={{ willChange: "transform" }}
        >
          {Array.from({ length: repetitions }).map((_, i) => (
            <div key={i} className="marquee-part flex items-center flex-shrink-0">
              {segments.map((segment, segIdx) => {
                const currentImage = images[segIdx % images.length];
                return (
                  <React.Fragment key={segIdx}>
                    <span
                      className="
                        font-syne font-bold text-black
                        text-xl sm:text-2xl md:text-3xl
                        whitespace-nowrap leading-none
                      "
                    >
                      {segment}
                    </span>
                    <ImagePill src={currentImage} fallback={FALLBACK_IMAGE} />
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ------------------------- GLASS PANEL ------------------------- */
function GlassProofPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const n50Ref = useRef<HTMLSpanElement>(null);
  const n1kRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const glow = glowRef.current;
    if (!panel) return;

     const scroller =
     (ScrollTrigger.getAll()[0] as any)?.vars?.scroller ||
     (ScrollTrigger.getAll()[0] as any)?.scroller ||
      undefined;


    const ctx = gsap.context(() => {
      gsap.set(panel, { autoAlpha: 0, y: 28, scale: 0.985 });
      if (glow) gsap.set(glow, { autoAlpha: 0, scale: 0 });

      const playOnce = () => {
        if (hasPlayedRef.current) return;
        hasPlayedRef.current = true;

        gsap.to(panel, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out" });
        if (glow) gsap.to(glow, { autoAlpha: 1, scale: 1, duration: 1.15, ease: "power3.out", delay: 0.05 });

        const a = { v: 0 };
        const b = { v: 0 };
        if (n50Ref.current) n50Ref.current.textContent = "0";
        if (n1kRef.current) n1kRef.current.textContent = "0";

        gsap.to(a, {
          v: 50,
          duration: 1.25,
          ease: "power2.out",
          onUpdate: () => {
            if (n50Ref.current) n50Ref.current.textContent = `${Math.round(a.v)}`;
          },
        });

        gsap.to(b, {
          v: 1000,
          duration: 1.25,
          ease: "power2.out",
          onUpdate: () => {
            if (!n1kRef.current) return;
            const val = Math.round(b.v);
            n1kRef.current.textContent = val >= 1000 ? "1k+" : `${val}`;
          },
        });

        const items = panel.querySelectorAll<HTMLElement>("[data-para]");
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", delay: 0.08 }
        );
      };

      const st = ScrollTrigger.create({
        trigger: panel,
        scroller,
        start: "top 85%",
        once: true,
        onEnter: playOnce,
      });

      let io: IntersectionObserver | null = null;
      if (typeof window !== "undefined" && "IntersectionObserver" in window) {
        io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              playOnce();
              io?.disconnect();
              st.kill();
            }
          },
          { threshold: 0.15 }
        );
        io.observe(panel);
      }

      const refreshHard = () => {
        ScrollTrigger.refresh();
        ScrollTrigger.update();
      };
      requestAnimationFrame(refreshHard);
      const r1 = window.setTimeout(refreshHard, 150);
      const r2 = window.setTimeout(refreshHard, 600);

      return () => {
        window.clearTimeout(r1);
        window.clearTimeout(r2);
        io?.disconnect();
        st.kill();
      };
    }, panel);

    return () => ctx.revert();
  }, []);

  return (
    <div className="mt-20 w-full flex justify-center px-4 overflow-x-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&display=swap'); .font-syne { font-family: 'Syne', sans-serif; }`}</style>

      <div ref={panelRef} className="glass-shell relative w-full max-w-5xl opacity-0">
        <div className="glass-border" />
        <div className="glass-shine-top" />
        <div className="glass-shine-left" />
        <div className="glass-inner" />

        <div ref={glowRef} className="glass-glow-wrapper">
          <div className="glass-water" />
        </div>

        <div className="glass-content relative z-10 px-5 py-8 sm:px-10 sm:py-12 md:px-14 md:py-14">
          <h2 className="mb-5 text-2xl font-bold text-white sm:text-3xl md:text-5xl glass-text" data-para>
            About our team
          </h2>

          <div className="space-y-4 text-white/90" data-para>
            <p className="text-sm leading-relaxed sm:text-base md:text-lg glass-text-soft">
              We build modern, high-performance digital products with clean UI, solid architecture, and strong attention
              to detail — from landing pages to full web apps.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-5 sm:flex sm:flex-row sm:gap-10" data-para>
            <div>
              <div className="text-3xl font-bold text-white sm:text-4xl md:text-5xl glass-text">
                <span ref={n50Ref}>0</span>+
              </div>
              <div className="mt-1 text-white/70 text-xs sm:text-sm glass-text-soft">Team Members</div>
            </div>

            <div>
              <div className="text-3xl font-bold text-white sm:text-4xl md:text-5xl glass-text">
                <span ref={n1kRef}>0</span>
              </div>
              <div className="mt-1 text-white/70 text-xs sm:text-sm glass-text-soft">Projects Completed</div>
            </div>
          </div>

          <a
            href="#work"
            data-para
            className="mt-7 inline-flex w-fit items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-md transition hover:-translate-y-[1px] hover:bg-white/14"
          >
            <ShinyText text="Work with us" speedMs={1600} pauseOnHover className="font-semibold tracking-wide" />
          </a>

          <div className="mt-12" data-para>
            <h4 className="font-syne font-bold text-[11px] uppercase tracking-widest mb-6 border-b border-white/10 pb-3 inline-block">
              <span className="values-gradient">Our Values</span>
            </h4>

            <div className="flex flex-col">
              {MENU_ITEMS.map((item, idx) => (
                <MenuItem key={idx} {...item} isFirst={idx === 0} />
              ))}
            </div>
          </div>
        </div>

        <style jsx>{`
          .glass-shell {
            position: relative;
            width: 100%;
            max-width: 72rem;
            margin: 0 auto;
            border-radius: 28px;
            overflow: hidden;
            min-height: 320px;
            isolation: isolate;
          }

          .glass-glow-wrapper {
            position: absolute;
            top: -120px;
            right: -120px;
            width: 450px;
            height: 450px;
            z-index: 1;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translateZ(0);
          }

          @media (max-width: 640px) {
            .glass-shell {
              border-radius: 22px;
              min-height: auto;
            }
            .glass-glow-wrapper {
              top: -80px;
              right: -80px;
              width: 280px;
              height: 280px;
              opacity: 0.9;
            }
          }

          @media (min-width: 641px) and (max-width: 1023px) {
            .glass-glow-wrapper {
              top: -95px;
              right: -95px;
              width: 360px;
              height: 360px;
            }
          }

          .glass-water {
            width: 100%;
            height: 100%;
            background: radial-gradient(
              circle at 50% 50%,
              rgba(34, 197, 94, 0.3) 0%,
              rgba(34, 197, 94, 0.1) 40%,
              rgba(34, 197, 94, 0) 70%
            );
            border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%;
            filter: blur(50px);
            animation: water-move 10s infinite linear;
          }

          @media (max-width: 640px) {
            .glass-water {
              filter: blur(40px);
            }
          }

          @keyframes water-move {
            0% {
              border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%;
              transform: rotate(0deg);
            }
            33% {
              border-radius: 40% 60% 42% 58% / 41% 51% 49% 59%;
            }
            66% {
              border-radius: 73% 27% 59% 41% / 52% 38% 62% 48%;
            }
            100% {
              border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%;
              transform: rotate(360deg);
            }
          }

          .glass-border {
            position: absolute;
            inset: 0;
            border-radius: 28px;
            background: linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.22),
              rgba(255, 255, 255, 0.08) 28%,
              rgba(255, 255, 255, 0.06) 60%,
              rgba(255, 255, 255, 0.12)
            );
            box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55),
              inset 0 1px 0 rgba(255, 255, 255, 0.28),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1);
            opacity: 1;
          }

          @media (max-width: 640px) {
            .glass-border {
              border-radius: 22px;
            }
          }

          .glass-inner {
            position: absolute;
            inset: 10px;
            border-radius: 22px;
            background: rgba(12, 14, 13, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(18px) saturate(1.2);
            -webkit-backdrop-filter: blur(18px) saturate(1.2);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 18px 42px rgba(0, 0, 0, 0.45);
          }

          @media (max-width: 640px) {
            .glass-inner {
              inset: 8px;
              border-radius: 18px;
            }
          }

          .glass-shine-top {
            position: absolute;
            left: 26px;
            right: 26px;
            top: 16px;
            height: 18px;
            border-radius: 999px;
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0),
              rgba(255, 255, 255, 0.26),
              rgba(255, 255, 255, 0)
            );
            opacity: 0.9;
            pointer-events: none;
          }

          @media (max-width: 640px) {
            .glass-shine-top {
              left: 18px;
              right: 18px;
              top: 12px;
              height: 14px;
              opacity: 0.75;
            }
          }

          .glass-shine-left {
            position: absolute;
            top: 28px;
            bottom: 28px;
            left: 14px;
            width: 14px;
            border-radius: 999px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
            opacity: 0.55;
            pointer-events: none;
          }

          @media (max-width: 640px) {
            .glass-shine-left {
              top: 18px;
              bottom: 18px;
              left: 10px;
              width: 10px;
              opacity: 0.45;
            }
          }

          .glass-content {
            position: relative;
            z-index: 2;
          }

          .glass-text {
            text-shadow: 0 10px 26px rgba(0, 0, 0, 0.55);
          }
          .glass-text-soft {
            text-shadow: 0 10px 20px rgba(0, 0, 0, 0.45);
          }

          .values-gradient {
            background: linear-gradient(90deg, #10b981 0%, #06b6d4 55%, #10b981 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            text-shadow: 0 6px 24px rgba(16, 185, 129, 0.22);
          }
        `}</style>
      </div>
    </div>
  );
}

/* ------------------------- MAIN SECTIONS COMPONENT ------------------------- */
export default function Sections({ loaded }: { loaded: boolean }) {
  const { t } = useTranslation();

  const rocketCursor = useMemo(() => {
    const rocketEmoji = "\uD83D\uDE80";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="6" y="24" font-size="22">${rocketEmoji}</text></svg>`;
    const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
    return `url("data:image/svg+xml,${encoded}") 16 16, auto`;
  }, []);

  const [businessHover, setBusinessHover] = useState(false);

  return (
    <>
      <style jsx global>{`
        @media (max-width: 1023px) {
          html.has-scroll-smooth,
          html.has-scroll-smooth body {
            position: static !important;
            overflow: auto !important;
            height: auto !important;
          }
        }
      `}</style>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 md:pb-28 md:pt-32">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div
            className={cn(
              "transition-all duration-700",
              loaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            )}
          >
            <h1 className="text-balance text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Innovative Digital Solutions to{" "}
              <span className="text-emerald-300">Grow Your </span>
              <span
                className={cn("text-emerald-300 transition-all duration-300", playfair.className)}
                style={{ cursor: businessHover ? rocketCursor : "pointer" }}
                onMouseEnter={() => setBusinessHover(true)}
                onMouseLeave={() => setBusinessHover(false)}
              >
                {t("business")}
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
              Xovato Tech Services – Building fast, beautiful, and results-driven websites, apps, and brands.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
              <a
                href="#work"
                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full p-[2px] transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
              >
                <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#10b981_50%,#000000_100%)]" />
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-8 py-1 text-sm font-bold tracking-wide text-white backdrop-blur-3xl transition-colors duration-300 group-hover:bg-zinc-900">
                  Schedule a Call
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 -z-10 rounded-full opacity-60 blur-lg transition duration-500 group-hover:opacity-100 group-hover:blur-xl bg-emerald-500/30" />
              </a>

              <a
                href="#cases"
                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full p-[2px] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full border border-emerald-500/40 bg-black px-8 py-1 text-sm font-semibold text-white backdrop-blur-3xl transition-colors duration-300 group-hover:bg-zinc-900 group-hover:border-emerald-500/70">
                  <span className="relative z-10">View our cases</span>
                  <div className="absolute inset-0 -z-10 rounded-full bg-emerald-500/0 blur-md transition duration-300 group-hover:bg-emerald-500/10" />
                </span>
              </a>
            </div>

            <div className="mt-16 flex justify-center md:hidden">
              <Rings3D />
            </div>
          </div>

          <div className="hidden items-center justify-center md:flex">
            <Rings3D />
          </div>
        </div>

        <GlassProofPanel />
      </section>

      {/* ✅ Reviews Globe section */}
      <section className="w-full">
        <div className="mx-auto mt-20 md:mt-28 max-w-6xl px-4 sm:px-6">
          <div className="relative mx-auto rounded-[28px] p-4 sm:p-6">
            {/* ✅ FIXED: remove country prop (widget detects itself) */}
            <GlobeReviewsWidget category="Web App" />
            <AgencyProcessSection />
          </div>
        </div>
      </section>
    </>
  );
}
