# acp-brand-kit

Batch export of the ACP canon into ready-to-use assets. **This repo draws nothing new** — it
tiles, re-grounds, and packages motifs that already exist in the ACP Design System Figma file
and on the deployed portfolio.

The authority document is [`BRAND.md`](BRAND.md) (v1.1). Where this README and `BRAND.md`
disagree, `BRAND.md` wins.

---

## Law Annex

*Reproduced verbatim from `BRAND.md` v1.1. These govern every asset in this repo.*

## THE SEVEN LAWS (verbatim — these govern every generated design)

**MOTIF LAW** — Two canon families. The Deployed Four — Diamond Eye, Compass Star, Plus Cross, Seed Burst — are the case-study identities, bound to their case colors. The Folk Five — Diamond Eye, Bloom Star, North Star, Quad Knot, Stem Bloom — are the folk library for fields, shuffles, and editorial surfaces. The two Diamond Eyes are different drawings and never substitute for each other. All motifs: reused verbatim, never redrawn, never recolored ad hoc. Grid-locked pixel art: translation is their only legal motion; rotation is banned by physics. Two dialects — crisp square and rounded stitch — one dialect per surface, never mixed.

**FIELD LAW v1.2** — Fields tile motif silhouettes on the 8px stitch grid. One dark ink: shadow #040519. Two legal strengths: 0.18 standard (decorative fields and strips), 0.13 whisper (fields behind readable content). On abyss and dark grounds the ink flips: peri #6F7BFF at 0.16. The inks trade places between worlds. One ink, one strength per field. Known deviation, logged for convergence: the deployed homepage cards use ink-deep #0A0B22 @ 0.13 — swap to shadow on the next portfolio lap; the difference is imperceptible and the vault keeps one ink.

**SHUFFLE LAW** — Mixed fields draw each slot's motif from the canon library by seeded random choice. Identity surfaces weight their totem at 70% (default — Commander retunes). Neutral surfaces shuffle evenly. Every field carries its seed; the seed is the design and must be logged. Randomness picks; it never draws.

**BAND LAW v1.2** — Three band voices. Eternal Thread: 18px, navy zigzag with vermilion and pink stitches on abyss bed — dark grounds only. Light Trim: 8px, four stitches including yellow — light grounds only. Deco Band: 88×66 checker tile, navy heartbeat with vermilion and pink accents on white — editorial moments. Bands never swap grounds. Print scale: band voices may scale by whole-number multiples (×2, ×3) with aspect ratio locked; fractional or single-axis scaling is forbidden.

**ARC LAW** — The embroidery arc is a frozen raster artifact, canon by adoption. Never regenerate. Source anatomy: a 320×320 frame clipping a 345×345 placement of a 1254×1254 bitmap carrying a second, hidden image fill — preserve all of it when copying. Screen use at placed scale; print up to roughly 10cm at 300dpi, never beyond. Its internal shapes are quarantined — never extracted into the motif library.

**MARK LAW** — Two voices. Full-color mark on dark controlled grounds only. Monochrome/currentColor mark in blend and light contexts. GenAI never draws the mark.

**PAIRING LAW** — two layers, two doctrines. Product surfaces (UI, dashboards, documents): the two-grounds doctrine holds. Ivory Loom and Night Field carry every screen. Ivory and navy carry the page; vermilion is spent in single moments; yellow and pink appear as thread, not field. Editorial surfaces (case cards, heroes, brand showcases, marketing): each identity accent — vermilion, peri, yellow, pink — may serve as ground and carry a motif field, as deployed on the portfolio since launch. Fields obey FIELD LAW's measured inks. Contrast is math, not taste, on both layers. Accent clause: small-size accent text on light grounds uses navy #080B83 or ink #3A3B5C; vermilion #FF4D00 is reserved for display-size type and graphic elements. When contrast fails, change the pairing, never the pigment.

---

## Manifest

### `/motifs/` — 10 files
```
motif_bloom-star_crisp.svg
motif_bloom-star_stitch.svg
motif_diamond-eye_crisp.svg
motif_diamond-eye_stitch.svg
motif_north-star_crisp.svg
motif_north-star_stitch.svg
motif_quad-knot_crisp.svg
motif_quad-knot_stitch.svg
motif_stem-bloom_crisp.svg
motif_stem-bloom_stitch.svg
```

### `/fields/` — 60 files
Silhouette-dialect fields, one motif per file, on the six deployed grounds. `.svg` is a 480x480 swatch with the tile as a pattern; `.png` is the same at 2x (960x960).

```
field_diamond-eye_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_bloom-star_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_north-star_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_quad-knot_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_stem-bloom_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
```

### `/bands/` — 3 files
```
band_deco-strip.svg
band_deco.svg
band_eternal-thread.svg
```

### `/mixed/` — 41 files
20 seeded Mixed Fields on ivory + abyss, even shuffle, silhouette dialect. A seed produces one layout; the layout is rendered on both grounds.

```
mix_s{1..20}_{ivory,abyss}.svg
contact-sheet.png
```

### `/css/` — 1 files
```
bands-and-fields.css
```

### `/marks/` — 2 files
```
pop-logo-color.png
pop-logo-mono.png
```

---

## Provenance

| Asset | Source | Method |
|---|---|---|
| Five Folk motifs | `*.svg` at repo root, 20px module | Parsed to integer grids; zero off-module rects |
| Motif dialects | the same grids | `stitch` = rx 4.6; `crisp` = rx 0. Colors verbatim, never recolored |
| Fields | motif silhouettes | Re-laid on the 8px stitch grid, one ink, one strength |
| Eternal Thread | `popescuportfolio/assets/case.css` `.thread-band` | Copied verbatim (48x16 tile) |
| Deco Band | Commander's tile spec | 88x66, 4x3 grid of 22px cells |
| Marks | `pop-logo-{color,mono}.png` | Copied untouched |

### Silhouette derivation
A field silhouette is every occupied cell of a motif **except** cells filled ivory `#FFF3F0` —
ivory is a ground color, so those cells are negative space, not ink. This affects `stem-bloom`
alone, which carries a 4-cell ivory knockout at its centre (50 cells -> 46 inked).

### Ink selection (FIELD LAW v1.2)
| Ground | Hex | Ink | Strength |
|---|---|---|---|
| ivory | `#FFF3F0` | shadow `#040519` | 0.18 |
| yellow | `#FDE12D` | shadow `#040519` | 0.18 |
| pink | `#F487B6` | shadow `#040519` | 0.18 |
| vermilion | `#FF4D00` | shadow `#040519` | 0.18 |
| peri | `#6F7BFF` | shadow `#040519` | 0.18 |
| abyss | `#04051A` | peri `#6F7BFF` | 0.16 |

All fields here are decorative, so all use **0.18 standard** (0.16 on dark). The 0.13 whisper
strength is reserved for fields sitting behind readable content and is not exported in this pack.

Spot-check: shadow on yellow at 0.18 composites to `#D0B929` — dusty olive, as specified.

---

## Seeds (SHUFFLE LAW)

Every mixed field carries its seed; **the seed is the design**. Layouts are a 4x4 grid of
16x16-cell slots, each slot drawing one of the Folk Five by seeded random choice, motif centred
in its slot. Neutral surfaces shuffle evenly, so selection here is uniform across all five —
no totem weighting.

The generator is a documented LCG so any seed regenerates identically:

```
state = seed
state = (state * 1664525 + 1013904223) mod 2^32     # advance
r     = state / 2^32                                 # in [0,1)
index = floor(r * 5)                                 # into the Folk Five, in canon order
```

Canon order: `diamond-eye, bloom-star, north-star, quad-knot, stem-bloom`.

Each SVG records its own seed in a `data-seed` attribute. **No seed in this commit is
"chosen"** — `contact-sheet.png` exists for the Commander to select from; a follow-up commit
prunes the losers.

---

## Usage

**Data-URI paste.** `css/bands-and-fields.css` carries every band and field as a self-contained
background rule. No asset requests, no build step:

```html
<div class="field-diamond-eye-ivory">...</div>
<div class="band-eternal-thread"></div>
```

**PNG @2x for Figma and print.** Field PNGs are 960x960 (2x of the 480 swatch) — drop straight
into Figma as an image fill, or place in print at up to 50% scale for 300dpi output.

**SVG for anything that scales.** The field SVGs use a `<pattern>`, so resizing the frame
re-tiles rather than stretching the motif.

### Prohibitions that bite in practice
- Never rotate a motif — translation is its only legal motion.
- Never mix dialects in one field.
- Bands never swap grounds: Eternal Thread on dark only, Light Trim on light only.
- Band scaling is whole-number and aspect-locked. Do not scale a band on one axis.
- Never introduce a color outside the twelve canon hexes. When contrast fails, change the
  pairing, never the pigment.

---

## Known deviations (logged, not fixed here)

1. **Eternal Thread renders at x1.125.** The canon tile is 48x16; the deployed `.thread-band`
   paints it at `54px 18px` to hit the 18px band height. That is aspect-locked but fractional,
   which BAND LAW v1.2's print-scale clause forbids. `band_eternal-thread.svg` reproduces the
   deployed band exactly rather than silently "correcting" it. Commander's call.
2. **Light Trim is absent.** No canon source for it exists in this workspace, and BAND LAW plus
   the component inventory do not fix its four stitch colors or their order. Not reconstructed
   by guess. Pending the Commander's tile.
3. **The 0.13 whisper strength is not exported.** Only decorative strengths ship here.
4. **`ink-deep` homepage drift.** BRAND.md logs the deployed cards at ink-deep `#0A0B22` @0.13;
   this pack uses shadow throughout, per the vault's one-ink rule.
