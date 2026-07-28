# ACP BRAND — Canon Ingestion Document
*Source of truth: the ACP Design System Figma file (canon vault). This document mirrors its laws and tokens verbatim for design-system ingestion. When this document and a generated design disagree, this document wins. Last synced: 28 July 2026 · v1.1 (accent + print-scale amendments).*

## Identity
Romanian cross-stitch motifs rendered as grid-locked pixel art over a strict palette. Swiss precision, Romanian thread. Never generic, never rotated, never redrawn.

## Palette (exact, non-negotiable)
- navy `#080B83` — primary thread and heartbeat
- vermilion `#FF4D00` — spent in single moments
- pink `#F487B6` — accent stitch
- yellow `#FDE12D` — accent stitch; light-band voice
- ivory `#FFF3F0` — Ivory Loom ground
- abyss `#04051A` — deepest dark ground
- peri `#6F7BFF` — periwinkle; identity accent and dark-ground field ink
- navy-soft `#1B1C45` — Night Field surfaces
- ink `#3A3B5C` — muted text
- ink-deep `#0A0B22` — deep text and legacy field ink (converging to shadow)
- white `#FFFFFF` — Deco Band ground
- shadow `#040519` — field ink for light and mid grounds

## Typography
- Display: Archivo Expanded (700–900) — headlines, uppercase, tight
- Body/UI: Archivo (400–700)
- Editorial voice: Source Serif 4, italic — pull quotes and human asides
- Mono: IBM Plex Mono (400–500) — kickers, labels, data, letter-spaced uppercase

## THE SEVEN LAWS (verbatim — these govern every generated design)

**MOTIF LAW** — Two canon families. The Deployed Four — Diamond Eye, Compass Star, Plus Cross, Seed Burst — are the case-study identities, bound to their case colors. The Folk Five — Diamond Eye, Bloom Star, North Star, Quad Knot, Stem Bloom — are the folk library for fields, shuffles, and editorial surfaces. The two Diamond Eyes are different drawings and never substitute for each other. All motifs: reused verbatim, never redrawn, never recolored ad hoc. Grid-locked pixel art: translation is their only legal motion; rotation is banned by physics. Two dialects — crisp square and rounded stitch — one dialect per surface, never mixed.

**FIELD LAW v1.2** — Fields tile motif silhouettes on the 8px stitch grid. One dark ink: shadow #040519. Two legal strengths: 0.18 standard (decorative fields and strips), 0.13 whisper (fields behind readable content). On abyss and dark grounds the ink flips: peri #6F7BFF at 0.16. The inks trade places between worlds. One ink, one strength per field. Known deviation, logged for convergence: the deployed homepage cards use ink-deep #0A0B22 @ 0.13 — swap to shadow on the next portfolio lap; the difference is imperceptible and the vault keeps one ink.

**SHUFFLE LAW** — Mixed fields draw each slot's motif from the canon library by seeded random choice. Identity surfaces weight their totem at 70% (default — Commander retunes). Neutral surfaces shuffle evenly. Every field carries its seed; the seed is the design and must be logged. Randomness picks; it never draws.

**BAND LAW v1.2** — Three band voices. Eternal Thread: 18px, navy zigzag with vermilion and pink stitches on abyss bed — dark grounds only. Light Trim: 8px, four stitches including yellow — light grounds only. Deco Band: 88×66 checker tile, navy heartbeat with vermilion and pink accents on white — editorial moments. Bands never swap grounds. Print scale: band voices may scale by whole-number multiples (×2, ×3) with aspect ratio locked; fractional or single-axis scaling is forbidden.

**ARC LAW** — The embroidery arc is a frozen raster artifact, canon by adoption. Never regenerate. Source anatomy: a 320×320 frame clipping a 345×345 placement of a 1254×1254 bitmap carrying a second, hidden image fill — preserve all of it when copying. Screen use at placed scale; print up to roughly 10cm at 300dpi, never beyond. Its internal shapes are quarantined — never extracted into the motif library.

**MARK LAW** — Two voices. Full-color mark on dark controlled grounds only. Monochrome/currentColor mark in blend and light contexts. GenAI never draws the mark.

**PAIRING LAW** — two layers, two doctrines. Product surfaces (UI, dashboards, documents): the two-grounds doctrine holds. Ivory Loom and Night Field carry every screen. Ivory and navy carry the page; vermilion is spent in single moments; yellow and pink appear as thread, not field. Editorial surfaces (case cards, heroes, brand showcases, marketing): each identity accent — vermilion, peri, yellow, pink — may serve as ground and carry a motif field, as deployed on the portfolio since launch. Fields obey FIELD LAW's measured inks. Contrast is math, not taste, on both layers. Accent clause: small-size accent text on light grounds uses navy #080B83 or ink #3A3B5C; vermilion #FF4D00 is reserved for display-size type and graphic elements. When contrast fails, change the pairing, never the pigment.

## Component inventory (in the Figma vault)
Nine motifs (4 Deployed + 5 Folk × 2 dialects) · Eternal Thread Tile 48×16 + Band 18px · Light Trim 32×8 unit / 768×8 strip · Deco Band Tile 88×66 + Strip · 10 Field tiles · 30 Field swatches (5 Folk motifs × 6 grounds) · Kicker · CTA Button · Note/Callout · Pillar Card · Brand mark, two voices · Embroidery arc (frozen raster).

## Hard prohibitions for generated work
Never rotate a motif. Never redraw or recolor a motif, band, or the mark. Never mix dialects in one field. Never place the full-color mark on a light ground. Never regenerate or upscale the embroidery arc. Never invent new motifs — new motifs are registered by the Commander only. Never create a color outside the twelve canon hexes, for any reason including contrast — when contrast fails, change the pairing, never the pigment. Never use the phrase "Complexity into Clarity" (permanently retired).
