import type { Metadata } from "next";
import "./globals.css";
import { geistSans, geistMono } from "./fonts";
import "locomotive-scroll/dist/locomotive-scroll.css";

import Providers from "./providers";
import IntroSplash from "./components/landing/IntroSplash";

export const metadata: Metadata = {
  title: "Xovato Tech",
  description: "Innovative digital solutions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {/* Intro overlay (shows once per session) */}
          <IntroSplash brand="Xovato" />

          {children}
        </Providers>
      </body>
    </html>
  );
}
