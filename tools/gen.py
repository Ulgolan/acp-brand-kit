#!/usr/bin/env python3
"""acp-brand-kit generator — canon export. Draws nothing new; tiles and re-grounds."""
import re, os, shutil, glob, io, ctypes, ctypes.util

def _load_cairo():
    """cairocffi resolves libcairo by name; macOS SIP strips DYLD_* for system python,
    so preload it by full path from the usual install locations."""
    for p in ("/opt/homebrew/lib/libcairo.2.dylib", "/usr/local/lib/libcairo.2.dylib",
              "/opt/homebrew/opt/cairo/lib/libcairo.2.dylib", "/usr/lib/libcairo.so.2",
              "/usr/lib/x86_64-linux-gnu/libcairo.so.2"):
        if os.path.exists(p):
            ctypes.CDLL(p, mode=ctypes.RTLD_GLOBAL)
            _of = ctypes.util.find_library
            ctypes.util.find_library = lambda n, _o=_of, _p=p: _p if "cairo" in n else _o(n)
            return
_load_cairo()
import cairosvg
from PIL import Image, ImageDraw, ImageFont

def rasterise(svg, w, h):
    """render an SVG string to a PIL image — PNGs come from the shipped SVGs, so they cannot drift"""
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=w, output_height=h)
    return Image.open(io.BytesIO(png)).convert("RGB")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # repo root
SRC  = os.path.join(ROOT, "sources")   # canonical inputs
OUT  = ROOT

# ---------- palette (the twelve canon hexes) ----------
NAVY, VERM, PINK, YELLOW = "#080B83", "#FF4D00", "#F487B6", "#FDE12D"
IVORY, ABYSS, PERI = "#FFF3F0", "#04051A", "#6F7BFF"
WHITE, SHADOW = "#FFFFFF", "#040519"
NAVYSOFT, INK, INKDEEP = "#1B1C45", "#3A3B5C", "#0A0B22"

# six deployed grounds
GROUNDS = {
    "ivory":     IVORY,
    "yellow":    YELLOW,
    "pink":      PINK,
    "vermilion": VERM,
    "peri":      PERI,
    "abyss":     ABYSS,
}
# FIELD LAW v1.2 — one dark ink shadow@0.18; on abyss/dark grounds it flips to peri@0.16
DARK_GROUNDS = {"abyss"}
def ink_for(ground):
    return (PERI, 0.16) if ground in DARK_GROUNDS else (SHADOW, 0.18)

MOTIFS = ["diamond-eye", "bloom-star", "north-star", "quad-knot", "stem-bloom"]

# source geometry: 20px module, 16.6 cell, rx 4.6, offset 1.7
MOD, CELL, RX, OFF = 20.0, 16.6, 4.6, 1.7
FIELD_MOD = 8.0                       # FIELD LAW — 8px stitch grid
K_CELL, K_RX, K_OFF = CELL/MOD, RX/MOD, OFF/MOD

def hx(h):
    h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def over(ink, ground, alpha):
    """alpha-composite ink onto ground -> solid rgb"""
    i, g = hx(ink), hx(ground)
    return tuple(int(round(alpha*i[c] + (1-alpha)*g[c])) for c in range(3))

def rgb2hex(t): return "#%02X%02X%02X" % t

# ---------- parse the five motif SVGs into integer grids ----------
def parse(name):
    s = open(f"{SRC}/{name}.svg").read()
    w, h = [int(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()[2:]]
    cells = []
    for x, y, cw, ch, rx, fill in re.findall(
        r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)" fill="(#[0-9A-Fa-f]{6})"', s):
        cx, cy = (float(x)-OFF)/MOD, (float(y)-OFF)/MOD
        assert abs(cx-round(cx)) < 1e-9 and abs(cy-round(cy)) < 1e-9, f"{name} off-module"
        assert float(cw) == CELL and float(ch) == CELL, f"{name} bad cell size"
        cells.append((int(round(cx)), int(round(cy)), fill.upper()))
    assert len(cells) == len(re.findall(r'<rect', s)), f"{name} unparsed rects"
    return {"name": name, "cols": w//20, "rows": h//20, "cells": cells}

M = {n: parse(n) for n in MOTIFS}

# silhouette = occupied cells minus ivory knockouts (ivory is ground, i.e. negative space)
def silhouette(m):
    return [(c, r) for c, r, f in m["cells"] if f != IVORY]

# ---------- SVG emitters ----------
def svg_open(w, h, extra="", rendering="geometricPrecision"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" shape-rendering="{rendering}"{extra}>')

def motif_svg(m, dialect):
    """standalone motif, native 20px module, colors verbatim. stitch=rounded, crisp=square."""
    rx = RX if dialect == "stitch" else 0
    w, h = m["cols"]*20, m["rows"]*20
    body = "".join(
        f'<rect x="{c*MOD+OFF:g}" y="{r*MOD+OFF:g}" width="{CELL:g}" height="{CELL:g}"'
        + (f' rx="{rx:g}"' if rx else "") + f' fill="{f}"/>'
        for c, r, f in m["cells"])
    return svg_open(w, h) + body + "</svg>"

def field_tile_svg(m, ground):
    """one field tile: silhouette on 8px stitch grid, single ink, single strength."""
    ink, a = ink_for(ground)
    w, h = m["cols"]*int(FIELD_MOD), m["rows"]*int(FIELD_MOD)
    cell, rx, off = K_CELL*FIELD_MOD, K_RX*FIELD_MOD, K_OFF*FIELD_MOD
    body = "".join(
        f'<rect x="{c*FIELD_MOD+off:g}" y="{r*FIELD_MOD+off:g}" width="{cell:g}" height="{cell:g}" '
        f'rx="{rx:g}"/>' for c, r in silhouette(m))
    return (svg_open(w, h) + f'<g fill="{ink}" fill-opacity="{a}">' + body + "</g></svg>")

FIELD_SWATCH = 480
def field_svg(m, ground):
    """deployable field swatch: ground + tiled silhouette."""
    ink, a = ink_for(ground)
    tw, th = m["cols"]*int(FIELD_MOD), m["rows"]*int(FIELD_MOD)
    cell, rx, off = K_CELL*FIELD_MOD, K_RX*FIELD_MOD, K_OFF*FIELD_MOD
    body = "".join(
        f'<rect x="{c*FIELD_MOD+off:g}" y="{r*FIELD_MOD+off:g}" width="{cell:g}" height="{cell:g}" '
        f'rx="{rx:g}"/>' for c, r in silhouette(m))
    S = FIELD_SWATCH
    return (svg_open(S, S)
            + f'<defs><pattern id="p" width="{tw}" height="{th}" patternUnits="userSpaceOnUse">'
            + f'<g fill="{ink}" fill-opacity="{a}">{body}</g></pattern></defs>'
            + f'<rect width="{S}" height="{S}" fill="{GROUNDS[ground]}"/>'
            + f'<rect width="{S}" height="{S}" fill="url(#p)"/></svg>')

# ---------- rasterisation: PNGs are rendered from the shipped SVGs ----------
def field_png(m, ground):
    """PNG @2x of the 480 swatch = 960x960"""
    return rasterise(field_svg(m, ground), FIELD_SWATCH*2, FIELD_SWATCH*2)

# ---------- SHUFFLE LAW: seeded mixed fields ----------
SLOT = 16          # 16x16 cell slot holds the largest motif (15x15 / 13x16)
GRID = 4           # 4x4 slots
MIX_PX = SLOT*GRID*int(FIELD_MOD)   # 512

def lcg(seed):
    """documented deterministic PRNG — the seed is the design"""
    s = seed & 0xFFFFFFFF
    while True:
        s = (s*1664525 + 1013904223) & 0xFFFFFFFF
        yield s / 2**32

def mix_layout(seed):
    """even shuffle across the Folk Five; same seed -> same layout on every ground"""
    g = lcg(seed)
    return [[MOTIFS[min(4, int(next(g)*5))] for _ in range(GRID)] for _ in range(GRID)]

def mix_cells(layout):
    """absolute silhouette cells for the whole mixed field, motifs centred in their slot"""
    out = []
    for sr, row in enumerate(layout):
        for sc, name in enumerate(row):
            m = M[name]
            ox = sc*SLOT + (SLOT - m["cols"])//2
            oy = sr*SLOT + (SLOT - m["rows"])//2
            out += [(ox+c, oy+r) for c, r in silhouette(m)]
    return out

def mix_svg(seed, ground):
    ink, a = ink_for(ground)
    cell, rx, off = K_CELL*FIELD_MOD, K_RX*FIELD_MOD, K_OFF*FIELD_MOD
    body = "".join(
        f'<rect x="{c*FIELD_MOD+off:g}" y="{r*FIELD_MOD+off:g}" width="{cell:g}" height="{cell:g}" '
        f'rx="{rx:g}"/>' for c, r in mix_cells(mix_layout(seed)))
    return (svg_open(MIX_PX, MIX_PX, f' data-seed="{seed}"')
            + f'<rect width="{MIX_PX}" height="{MIX_PX}" fill="{GROUNDS[ground]}"/>'
            + f'<g fill="{ink}" fill-opacity="{a}">{body}</g></svg>')

def mix_png(seed, ground, size=MIX_PX):
    return rasterise(mix_svg(seed, ground), size, size)

# ---------- BAND LAW ----------
# Eternal Thread — canon tile fetched verbatim from popescuportfolio assets/case.css .thread-band
ET_NAVY = "M0 8h4v4H0zM4 4h4v4H4zM8 0h4v4H8zM12 4h4v4h-4zM16 8h4v4h-4zM20 4h4v4h-4zM24 0h4v4h-4zM28 4h4v4h-4zM32 8h4v4h-4zM36 4h4v4h-4zM40 0h4v4h-4zM44 4h4v4h-4z"
ET_VERM = "M8 8h4v4H8zM24 8h4v4h-4zM40 8h4v4h-4z"
ET_PINK = "M0 0h4v4H0zM16 0h4v4h-4zM32 0h4v4h-4z"

def band_eternal_thread():
    """18px band, abyss bed — reproduces the deployed .thread-band exactly (48x16 tile @ x1.125)."""
    w, h, k = 54, 18, 1.125
    return (svg_open(w, h)
            + f'<rect width="{w}" height="{h}" fill="{ABYSS}"/>'
            + f'<g transform="scale({k})" shape-rendering="crispEdges">'
            + f'<path d="{ET_NAVY}" fill="{NAVY}"/>'
            + f'<path d="{ET_VERM}" fill="{VERM}"/>'
            + f'<path d="{ET_PINK}" fill="{PINK}"/>'
            + "</g></svg>")

# Deco Band — 88x66, 4x3 grid of 22px cells, white ground
DECO = [[WHITE, VERM,  WHITE, NAVY],
        [NAVY,  WHITE, NAVY,  WHITE],
        [WHITE, NAVY,  WHITE, PINK]]

def deco_tile_body(xoff=0):
    return "".join(
        f'<rect x="{xoff+c*22}" y="{r*22}" width="22" height="22" fill="{DECO[r][c]}"/>'
        for r in range(3) for c in range(4))

# Light Trim — canon vault measurement, verbatim. 32x8 unit, transparent ground,
# four 5x5 stitches on an 8px horizontal grid with staggered vertical offsets.
LIGHT_TRIM = [(0, 2, NAVY), (8, 0, VERM), (16, 3, YELLOW), (24, 1, PINK)]

def band_light_trim():
    """32x8 unit, transparent ground — light grounds only. Strip = this unit repeated 24x (768x8)."""
    return (svg_open(32, 8, rendering="crispEdges")
            + "".join(f'<rect x="{x}" y="{y}" width="5" height="5" fill="{c}"/>'
                      for x, y, c in LIGHT_TRIM)
            + "</svg>")

def band_deco():
    return (svg_open(88, 66, rendering="crispEdges")
            + f'<rect width="88" height="66" fill="{WHITE}"/>' + deco_tile_body() + "</svg>")

def band_deco_strip():
    w = 88*4
    return (svg_open(w, 66, rendering="crispEdges")
            + f'<rect width="{w}" height="66" fill="{WHITE}"/>'
            + "".join(deco_tile_body(i*88) for i in range(4)) + "</svg>")

# ---------- data-URI CSS ----------
def data_uri(svg):
    for a, b in [("%", "%25"), ("#", "%23"), ("<", "%3C"), (">", "%3E"),
                 ('"', "'"), ("\n", "")]:
        svg = svg.replace(a, b)
    return "data:image/svg+xml," + svg

# ---------- write everything ----------
def wf(path, content, binary=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if binary: content.save(path)
    else: open(path, "w").write(content)

written = []
def emit(rel, content, binary=False):
    wf(f"{OUT}/{rel}", content, binary); written.append(rel)

def build():
    """emit the full manifest. Importers get the canon model without side effects."""
        # 1. motifs
    for n, m in M.items():
        for d in ("crisp", "stitch"):
            emit(f"motifs/motif_{n}_{d}.svg", motif_svg(m, d))

    # 2. fields
    for n, m in M.items():
        for g in GROUNDS:
            emit(f"fields/field_{n}_{g}.svg", field_svg(m, g))
            emit(f"fields/field_{n}_{g}.png", field_png(m, g), binary=True)

    # 3. bands
    emit("bands/band_eternal-thread.svg", band_eternal_thread())
    emit("bands/band_light-trim.svg", band_light_trim())
    emit("bands/band_deco.svg", band_deco())
    emit("bands/band_deco-strip.svg", band_deco_strip())

    # 4. mixed
    for seed in range(1, 21):
        for g in ("ivory", "abyss"):
            emit(f"mixed/mix_s{seed}_{g}.svg", mix_svg(seed, g))

    # contact sheet — 40 tiles, seeds paired by ground, labelled
    def contact_sheet():
        T, PAD, LAB = 232, 16, 20
        cols, rows = 8, 5
        W = PAD + cols*(T+PAD)
        H = PAD + rows*(T+LAB+PAD) + 44
        sheet = Image.new("RGB", (W, H), hx(IVORY))
        d = ImageDraw.Draw(sheet)
        try: font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 13)
        except Exception: font = ImageFont.load_default()
        try: title = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 17)
        except Exception: title = font
        d.text((PAD, 14), "ACP BRAND KIT — MIXED FIELD CONTACT SHEET — SEEDS 1-20 — "
                          "SILHOUETTE DIALECT — EVEN SHUFFLE", fill=hx(NAVY), font=title)
        for i in range(40):
            seed, g = i//2 + 1, ("ivory", "abyss")[i % 2]
            cx, cy = i % cols, i//cols
            x = PAD + cx*(T+PAD)
            y = 44 + PAD + cy*(T+LAB+PAD)
            sheet.paste(mix_png(seed, g, T), (x, y))
            d.rectangle([x, y, x+T-1, y+T-1], outline=hx(NAVY))
            d.text((x, y+T+4), f"s{seed:02d} {g}", fill=hx(NAVY), font=font)
        return sheet

    emit("mixed/contact-sheet.png", contact_sheet(), binary=True)

    # 5. marks — copied untouched
    for src, dst in [("pop-logo-color.png", "marks/pop-logo-color.png"),
                     ("pop-logo-mono.png", "marks/pop-logo-mono.png")]:
        os.makedirs(f"{OUT}/marks", exist_ok=True)
        shutil.copy2(f"{SRC}/{src}", f"{OUT}/{dst}"); written.append(dst)

    print("WRITTEN:", len(written))

    # verification probe
    print("VERIFY yellow/shadow@0.18 ->", rgb2hex(over(SHADOW, YELLOW, 0.18)))
    print("VERIFY abyss/peri@0.16   ->", rgb2hex(over(PERI, ABYSS, 0.16)))
    for n, m in M.items():
        print(f"  {n:12} grid={m['cols']}x{m['rows']} cells={len(m['cells'])} silhouette={len(silhouette(m))}")


if __name__ == "__main__":
    build()
