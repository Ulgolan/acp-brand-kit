import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// popescuportfolio type system, self-hosted via next/font:
// Archivo (body/structure + display) · IBM Plex Mono (metadata/kickers) ·
// Source Serif 4 italic (the voice).
//
// RA-1: there is no `Archivo_Expanded` export in next/font/google — the family
// does not exist in Google's registry (only Archivo, Archivo Black, Archivo
// Narrow). Archivo itself is variable on two axes, wdth 62..125 and wght
// 100..900, so the expanded cut is the SAME typeface at wdth 125. One loader,
// both jobs: `axes: ["wdth"]` opens the width axis (weight must be omitted —
// next/font only accepts `axes` when the weight is variable), and the display
// face is selected in globals.css with `font-stretch: 125%`.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACP's CLAUDE DASHBOARD",
  description: "Personal command center for project cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${ibmPlexMono.variable} ${sourceSerif.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
