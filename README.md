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

### `/sources/` — 7 files
The canonical inputs. **Not build output — do not regenerate these.** The loom reads them; everything else in this repo is derived from them.

```
bloom-star.svg
diamond-eye.svg
north-star.svg
pop-logo-color.png
pop-logo-mono.png
quad-knot.svg
stem-bloom.svg
```

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
Silhouette-dialect fields, one motif per file, on the six deployed grounds. `.svg` is a 480x480 swatch carrying the tile as a `<pattern>`; `.png` is the same at 2x (960x960).

```
field_diamond-eye_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_bloom-star_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_north-star_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_quad-knot_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
field_stem-bloom_{ivory,yellow,pink,vermilion,peri,abyss}.{svg,png}
```

### `/bands/` — 4 files
```
band_deco-strip.svg
band_deco.svg
band_eternal-thread.svg
band_light-trim.svg
```

### `/mixed/` — 41 files
20 seeded Mixed Fields on ivory + abyss, even shuffle, silhouette dialect. A seed produces one layout; that layout is rendered on both grounds.

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

### `/tools/` — 3 files
```
docs.py
gen.py
requirements.txt
```

---

## The loom

`tools/` holds the generator that produced every derived file here. It is committed so the
**seed-reproducibility guarantee is verifiable from this repo alone, forever** — the seed is the
design, and the loom is what proves it.

```bash
brew install cairo                        # native dep; apt-get install libcairo2 on Debian
pip install -r tools/requirements.txt
python3 tools/gen.py                      # motifs, fields, bands, mixed, contact sheet, marks
python3 tools/docs.py                     # css + this README
```

`gen.py` is idempotent: running it on a clean checkout reproduces every tracked file
byte-for-byte. `docs.py` imports `gen.py` as a model and emits nothing on import.

---

## Provenance

| Asset | Source | Method |
|---|---|---|
| Five Folk motifs | `sources/*.svg`, 20px module | Parsed to integer grids; zero off-module rects |
| Motif dialects | the same grids | `stitch` = rx 4.6; `crisp` = rx 0. Colors verbatim, never recolored |
| Fields | motif silhouettes | Re-laid on the 8px stitch grid, one ink, one strength |
| Eternal Thread | `popescuportfolio/assets/case.css` `.thread-band` | Copied verbatim (48x16 source coords) |
| Light Trim | Canon vault measurement | 32x8, four 5x5 stitches, staggered |
| Deco Band | Canon tile spec | 88x66, 4x3 grid of 22px cells |
| Marks | `sources/pop-logo-{color,mono}.png` | Copied untouched (byte-identical) |

### Why `sources/` is tracked
The five motif SVGs and both logo PNGs are **not** redundant with `motifs/` and `marks/`.
`motifs/` files are re-serialised into two dialects and are build output; the logos in `marks/`
are byte-identical copies. The loom reads `sources/` at build time, so removing it would break
reproducibility — the one thing this repo must guarantee. They stay, relocated from the repo
root into `sources/` to separate input from output.

---

## Canon interpretations

Two readings were required during the export and are **blessed as canon**:

**1. `stem-bloom`'s ivory cells are negative space, not ink.** The motif carries a 4-cell ivory
`#FFF3F0` knockout at its centre. Ivory is a ground color, so those cells are holes: the field
silhouette omits them (50 cells -> 46 inked). No other motif is affected; every other silhouette
is 1:1 with its cell count.

**2. Peri is a mid ground and takes shadow @0.18.** FIELD LAW's ink flip is triggered by *dark*
grounds. Only abyss (and future dark grounds) take peri `#6F7BFF` @0.16. Peri `#6F7BFF` used
*as a ground* is a mid tone and carries shadow `#040519` @0.18 like ivory, yellow, pink, and
vermilion.

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
strength is reserved for fields behind readable content and is not exported in this pack.

Spot-check: shadow on yellow at 0.18 composites to `#D0B929` — dusty olive, as specified.

---

## Bands

| Band | Native | Ground | Notes |
|---|---|---|---|
| Eternal Thread | 54x18 | abyss bed | **Dark grounds only** |
| Light Trim | 32x8 | transparent | **Light grounds only**; strip = unit x24 = 768x8 |
| Deco Band | 88x66 | white | Editorial moments; `band_deco-strip.svg` is the 4-repeat |

### Ruling: Eternal Thread's 48x16 -> 54x18 is not a scaling operation
BAND LAW fixes Eternal Thread at **18px**. The 48x16 tile is *source coordinates*; x1.125 is
simply what "18px tall" means for that tile. It is the voice's definition, not a transform.
BAND LAW v1.2's print-scale clause governs scaling a voice **beyond its native size**
(18 -> 36, 8 -> 16), and that clause is fully in force above 18px. Not a deviation.

---

## Seeds (SHUFFLE LAW)

Every mixed field carries its seed; **the seed is the design**. Layouts are a 4x4 grid of
16x16-cell slots, each slot drawing one of the Folk Five by seeded random choice, motif centred
in its slot. Neutral surfaces shuffle evenly, so selection is uniform across all five — no totem
weighting.

The generator is a documented LCG, so any seed regenerates identically:

```
state = seed
state = (state * 1664525 + 1013904223) mod 2^32     # advance
r     = state / 2^32                                 # in [0,1)
index = floor(r * 5)                                 # into the Folk Five, in canon order
```

Canon order: `diamond-eye, bloom-star, north-star, quad-knot, stem-bloom`.

Each SVG records its own seed in a `data-seed` attribute. A seed produces one layout, which is
then rendered on each ground — so `mix_s7_ivory` and `mix_s7_abyss` are the same design in two
worlds. **No seed in this commit is "chosen"**; `contact-sheet.png` exists for the Commander to
select from, and a follow-up commit prunes the losers.

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

**SVG for anything that scales.** Field SVGs use a `<pattern>`, so resizing the frame re-tiles
rather than stretching the motif.

### Prohibitions that bite in practice
- Never rotate a motif — translation is its only legal motion.
- Never mix dialects in one field.
- Bands never swap grounds: Eternal Thread on dark only, Light Trim on light only.
- Scaling a band beyond native is whole-number and aspect-locked. Never scale on one axis.
- Never introduce a color outside the twelve canon hexes. When contrast fails, change the
  pairing, never the pigment.

---

## Known deviations (logged, not fixed here)

1. **The 0.13 whisper strength is not exported.** Only decorative strengths ship in this pack.
2. **`ink-deep` homepage drift.** `BRAND.md` logs the deployed cards at ink-deep `#0A0B22`
   @0.13; this pack uses shadow `#040519` throughout, per the vault's one-ink rule.
3. **Dashboard app files relocated.** `globals.css`, `layout.tsx`, and `page.tsx` were found at
   this repo's root. They are dashboard deployment files, not brand-kit files; they were moved
   to `../brand-kit-attic/` on disk (outside this repo) and removed from tracking. Nothing was
   deleted. Their final home is a separate decision.
