"use client";
import dynamic from 'next/dynamic';
import React from "react";

type Props = {
  text: string;
  className?: string;
  speedMs?: number; // shimmer speed
  pauseOnHover?: boolean;
};

export default function ShinyText({
  text,
  className = "",
  speedMs = 2000,
  pauseOnHover = true,
}: Props) {
  return (
    <span
      className={[
        "shiny-text inline-block",
        pauseOnHover ? "shiny-pause-on-hover" : "",
        className,
      ].join(" ")}
      style={{ ["--shine-speed" as any]: `${speedMs}ms` }}
    >
      {text}

      <style jsx>{`
        .shiny-text {
          position: relative;
          display: inline-block;
          
          /* 1. The Gradient: Dim -> Bright -> Dim (Loops perfectly) */
          background-image: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0.4) 0%, 
            rgba(255, 255, 255, 0.9) 50%, 
            rgba(255, 255, 255, 0.4) 100%
          );
          
          /* 2. Size & Repeat: Stretch it out and repeat it horizontally */
          background-size: 200% 100%;
          background-repeat: repeat-x;
          
          /* 3. Clip it to text */
          -webkit-background-clip: text;
          background-clip: text;
          
          /* 4. Make text transparent so background shows through */
          -webkit-text-fill-color: transparent;
          color: transparent; 

          /* 5. Animation: Move exactly one full cycle */
          animation: shine var(--shine-speed, 2000ms) linear infinite;
        }

        @keyframes shine {
          0% {
            background-position: 0% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .shiny-pause-on-hover:hover {
          animation-play-state: paused;
        }
      `}</style>
    </span>
  );
}