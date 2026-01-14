"use client";
import dynamic from 'next/dynamic';

import { cn } from "../../lib/cn";

type Props = {
  show: boolean;
};

export default function ScrollCTA({ show }: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all duration-500",
        show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 border border-emerald-500/25 bg-black p-3 shadow-[0_30px_110px_rgba(0,0,0,0.8)]">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">
            Ready to impress your clients?
          </div>
          <div className="truncate text-xs text-white/60">
            Let’s build your premium website/app.
          </div>
        </div>

      
      </div>
    </div>
  );
}
