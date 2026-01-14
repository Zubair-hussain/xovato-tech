"use client";

import React from "react";
import "../app/lib/i18n"; // or "@/lib/i18n" if alias works

export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
