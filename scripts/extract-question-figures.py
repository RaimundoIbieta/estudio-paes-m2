# -*- coding: utf-8 -*-
"""Recorta enunciado + alternativas A-D con bandas por puntos medios (fracciones completas)."""
from __future__ import annotations

import json
import re
from pathlib import Path

import fitz
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CONTENIDOS = ROOT / "Contenidos"
ASSETS = ROOT / "assets" / "contenidos"

PDF_MAP = {
    "m1": {
        "2025": "2025-24-12-04-paes-regular-matematica1-p2025.pdf",
        "2026": "2026-25-12-03-paes-regular-matematica1-p2026.pdf",
    },
    "m2": {
        "2025": "2025-24-12-02-paes-regular-matematica2-p2025.pdf",
        "2026": "2026-25-12-01-paes-regular-matematica2-p2026.pdf",
    },
    "cl": {
        "2025": "2025-24-12-03-paes-regular-competencia-lectora-p2025.pdf",
        "2026": "2026-25-12-02-paes-regular-competencia-lectora-p2026.pdf",
    },
    "hcs": {
        "2025": "2025-24-12-04-paes-regular-historia-p2025.pdf",
        "2026": "2026-25-12-03-paes-regular-historia-p2026.pdf",
    },
}

ZOOM = 2.6
STEM_TOP_PAD = 22
STEM_INK_PAD = 12
OPT_EDGE_PAD = 10  # glifos, barras de fraccion e iconos fuera del bbox
FOOTER_RE = re.compile(r"^-\s*\d+\s*-$")


def span_ink_top(span: dict) -> float:
    """Estima el borde superior real del glifo (bbox PyMuPDF suele quedar corto)."""
    text = span.get("text", "")
    if not text.strip():
        return span["bbox"][1]  # ignorar en el min(); espacios de maquetacion
    y0 = span["bbox"][1]
    size = float(span.get("size") or 12)
    asc = float(span.get("ascender") or 0.9)
    if size >= 13:
        pad = max(STEM_INK_PAD, size * 1.35)
    else:
        pad = STEM_INK_PAD
    return y0 - pad


def stem_top_from_spans(page: fitz.Page, cand: dict, stem_bottom: float) -> float:
    """Tinta del enunciado (columna izquierda y formulas), sin cabecera FORMA."""
    stem_top = stem_bottom
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = span.get("text", "")
                if not text.strip():
                    continue
                if "FORMA" in text:
                    continue
                x0, y0, x1, y1 = span["bbox"]
                if x0 > page.rect.width - 40:
                    continue
                if y0 >= stem_bottom:
                    continue
                if y1 < cand["y0"] - 18:
                    continue
                stem_top = min(stem_top, span_ink_top(span))
    return max(0.0, stem_top)


def trim_stem_header(im: Image.Image) -> Image.Image:
    """Quita filas del encabezado FORMA (centrado); conserva desde el numero de pregunta."""
    w, h = im.size
    px = im.convert("L").load()
    # Solo columna del numero de pregunta (FORMA queda mas a la derecha en el PNG)
    scan_left = 28
    scan_right = min(int(w * 0.22), 260)
    for y in range(h):
        if any(px[x, y] < 240 for x in range(scan_left, scan_right)):
            top = max(0, y - 22)
            if top > 0:
                return im.crop((0, top, w, h))
            break
    return im


NUM_ONLY_RE = re.compile(r"^(\d{1,2})\.\s*$")
NUM_TEXT_RE = re.compile(r"^(\d{1,2})\.\s+\S+")
OPTION_RE = re.compile(r"^([A-E])\)")


def pdf_path(filename: str) -> Path | None:
    for base in (CONTENIDOS, ASSETS):
        p = base / filename
        if p.exists():
            return p
    return None


def page_lines(page: fitz.Page):
    out = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
            if not text:
                continue
            x0, y0, x1, y1 = line["bbox"]
            out.append((x0, y0, x1, y1, text))
    out.sort(key=lambda t: (t[1], t[0]))
    return out


def page_words(page: fitz.Page):
    return page.get_text("words")  # x0,y0,x1,y1,word,...


def expand_option_ink(page: fitz.Page, words, markers, hard_end: float):
    """Tinta de texto + imagenes/dibujos cercanos a cada marcador A-D."""
    centers = [(m["y0"] + m["y1"]) / 2 for m in markers]
    right_limit = page.rect.width - 40
    # Rects auxiliares (botones inline, iconos, etc.)
    extras = []
    for info in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = info["bbox"]
        h = y1 - y0
        w = x1 - x0
        # Iconos de alternativas suelen ser pequenos; figuras grandes van al enunciado
        if h > 55 or w > 120:
            continue
        extras.append((x0, y0, x1, y1, "img"))
    for d in page.get_drawings():
        r = d.get("rect")
        if not r:
            continue
        h = r.height
        w = r.width
        # Barras de fraccion suelen tener h=0 en el PDF
        if h > 55 or w > 120 or (h > 2 and w > 200):
            continue
        extras.append((r.x0, r.y0, r.x1, r.y1, "draw"))

    results = []
    for i, m in enumerate(markers):
        assigned = []
        for w in words:
            x0, y0, x1, y1 = w[0], w[1], w[2], w[3]
            if x0 > right_limit:
                continue
            if y1 < markers[0]["y0"] - 55:
                continue
            if y0 > hard_end:
                continue
            wc = (y0 + y1) / 2
            dists = [abs(wc - c) for c in centers]
            if min(dists) > 28:
                continue
            if dists.index(min(dists)) != i:
                continue
            assigned.append((y0, y1))

        for x0, y0, x1, y1, _kind in extras:
            if x0 > right_limit:
                continue
            if y1 < markers[0]["y0"] - 40:
                continue
            if y0 > hard_end:
                continue
            wc = (y0 + y1) / 2
            dists = [abs(wc - c) for c in centers]
            # Imagenes de botones: umbral un poco mas holgado
            if min(dists) > 22:
                continue
            if dists.index(min(dists)) != i:
                continue
            assigned.append((y0, y1))

        if assigned:
            ink_y0 = min(a[0] for a in assigned)
            ink_y1 = max(a[1] for a in assigned)
        else:
            ink_y0, ink_y1 = m["y0"], m["y1"]

        results.append({
            "letter": m["letter"],
            "ink_y0": ink_y0,
            "ink_y1": ink_y1,
            "marker_y0": m["y0"],
            "marker_y1": m["y1"],
            "center": centers[i],
        })
    return results


def midpoint_bands(ink_opts, stem_bottom: float, hard_end: float):
    """Cubre tinta completa; reparte el hueco entre opciones en el punto medio."""
    n = len(ink_opts)
    bands = []
    for i, opt in enumerate(ink_opts):
        y0 = opt["ink_y0"] - OPT_EDGE_PAD
        y1 = opt["ink_y1"] + OPT_EDGE_PAD

        if i == 0:
            y0 = max(stem_bottom + 0.5, y0)
        else:
            gap_mid = (ink_opts[i - 1]["ink_y1"] + opt["ink_y0"]) / 2
            y0 = max(gap_mid, y0)
            y0 = max(bands[i - 1]["y1"] + 0.5, y0)

        if i + 1 < n:
            gap_mid = (opt["ink_y1"] + ink_opts[i + 1]["ink_y0"]) / 2
            y1 = min(gap_mid, y1)
        else:
            y1 = min(hard_end, y1)

        # Priorizar tinta completa si el hueco es estrecho
        y0 = min(y0, opt["ink_y0"] - 3)
        y1 = max(y1, opt["ink_y1"] + 3)

        if y1 - y0 < 22:
            y1 = y0 + 26

        bands.append({"letter": opt["letter"], "y0": y0, "y1": y1})
    return bands


GRID_ROW_Y_THRESH = 28
PAGE_MARGIN_X = 36


def cluster_option_rows(markers: list[dict]) -> list[list[dict]]:
    """Agrupa A-D en filas (layout 2x2 con A,B arriba y C,D abajo)."""
    sorted_m = sorted(markers, key=lambda m: (m["y0"], m["x0"]))
    rows: list[list[dict]] = []
    for m in sorted_m:
        for row in rows:
            if abs(m["y0"] - row[0]["y0"]) < GRID_ROW_Y_THRESH:
                row.append(m)
                break
        else:
            rows.append([m])
    for row in rows:
        row.sort(key=lambda m: m["x0"])
    rows.sort(key=lambda row: row[0]["y0"])
    return rows


def is_grid_layout(markers: list[dict]) -> bool:
    if len(markers) != 4:
        return False
    rows = cluster_option_rows(markers)
    if len(rows) != 2 or len(rows[0]) != 2 or len(rows[1]) != 2:
        return False
    return abs(rows[0][0]["x0"] - rows[0][1]["x0"]) > 80


def grid_option_bounds(
    page: fitz.Page,
    markers: list[dict],
    stem_bottom: float,
    hard_end: float,
) -> list[dict]:
    """Recorte 2x2: cada celda nace en su letra y crece solo con su tinta/imagen."""
    rows = cluster_option_rows(markers)
    page_width = page.rect.width
    right_x = page_width - PAGE_MARGIN_X
    assert len(rows) == 2 and all(len(r) == 2 for r in rows)

    left_x = (rows[0][0]["x0"] + rows[1][0]["x0"]) / 2
    right_col_x = (rows[0][1]["x0"] + rows[1][1]["x0"]) / 2
    x_mid = (left_x + right_col_x) / 2

    letter_at = {
        (0, 0): rows[0][0]["letter"],
        (0, 1): rows[0][1]["letter"],
        (1, 0): rows[1][0]["letter"],
        (1, 1): rows[1][1]["letter"],
    }
    marker_by = {m["letter"]: m for m in markers}

    cells = {}
    for ri in range(2):
        for ci in range(2):
            letter = letter_at[(ri, ci)]
            m = marker_by[letter]
            cells[letter] = {
                "letter": letter,
                "ri": ri,
                "ci": ci,
                "x0": m["x0"] - 6,
                "x1": m["x0"] + 70,
                "y0": m["y0"] - OPT_EDGE_PAD,
                "y1": m["y1"] + 20,
            }

    def owning_letter(cx: float, cy: float) -> str | None:
        if cy < stem_bottom - 10 or cy > hard_end + 15:
            return None
        if cy < min(m["y0"] for m in markers) - 25:
            return None
        # Centro de atraccion bajo la letra (donde esta el grafico)
        centers = {
            m["letter"]: (m["x0"] + 55, m["y0"] + 75)
            for m in markers
        }
        best = min(
            centers.items(),
            key=lambda item: (cx - item[1][0]) ** 2 + (cy - item[1][1]) ** 2,
        )
        letter, (mx, my) = best
        # Rechazar tinta demasiado lejos del marcador (siguiente pregunta)
        if abs(cx - mx) > 180 or cy - marker_by[letter]["y0"] > 220:
            return None
        if marker_by[letter]["y0"] - cy > 40:
            return None
        return letter

    def expand(letter: str, x0, y0, x1, y1, pad=4):
        c = cells[letter]
        c["x0"] = min(c["x0"], x0 - pad)
        c["y0"] = min(c["y0"], y0 - pad)
        c["x1"] = max(c["x1"], x1 + pad)
        c["y1"] = max(c["y1"], y1 + pad)

    for info in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = info["bbox"]
        if (x1 - x0) < 40 or (y1 - y0) < 40:
            continue
        letter = owning_letter((x0 + x1) / 2, (y0 + y1) / 2)
        if letter:
            expand(letter, x0, y0, x1, y1, pad=8)

    for d in page.get_drawings():
        r = d.get("rect")
        if not r:
            continue
        letter = owning_letter((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
        if not letter:
            continue
        if r.width >= 12 or r.height >= 12 or r.width == 0 or r.height == 0:
            expand(letter, r.x0, r.y0, r.x1, r.y1, pad=6)

    for w in page.get_text("words"):
        wx0, wy0, wx1, wy1, text = w[0], w[1], w[2], w[3], w[4]
        if text in ("A)", "B)", "C)", "D)", "E)"):
            continue
        letter = owning_letter((wx0 + wx1) / 2, (wy0 + wy1) / 2)
        if letter:
            expand(letter, wx0, wy0, wx1, wy1, pad=3)

    # Separar solo si hay solape real (no recortar graficos con y_mid/x_mid a ciegas)
    for ri in range(2):
        L = cells[letter_at[(ri, 0)]]
        R = cells[letter_at[(ri, 1)]]
        if L["x1"] > R["x0"]:
            mid = (L["x1"] + R["x0"]) / 2
            L["x1"] = mid
            R["x0"] = mid
    for ci in range(2):
        T = cells[letter_at[(0, ci)]]
        B = cells[letter_at[(1, ci)]]
        if T["y1"] > B["y0"]:
            mid = (T["y1"] + B["y0"]) / 2
            T["y1"] = mid
            B["y0"] = mid

    # Si hay imagen de grafico, ajustar la celda al bbox imagen+letra (sin medio pagina vacio)
    images_by: dict[str, list[tuple[float, float, float, float]]] = {L: [] for L in cells}
    for info in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = info["bbox"]
        if (x1 - x0) < 40 or (y1 - y0) < 40:
            continue
        letter = owning_letter((x0 + x1) / 2, (y0 + y1) / 2)
        if not letter:
            continue
        images_by[letter].append((x0, y0, x1, y1))

    for letter, imgs in images_by.items():
        if not imgs:
            continue
        m = marker_by[letter]
        c = cells[letter]
        c["x0"] = min(m["x0"] - 6, min(b[0] for b in imgs) - 6)
        c["x1"] = max(m["x0"] + 40, max(b[2] for b in imgs) + 6)
        c["y0"] = min(m["y0"] - OPT_EDGE_PAD, min(b[1] for b in imgs) - 6)
        c["y1"] = max(m["y1"] + 10, max(b[3] for b in imgs) + 12)
        for w in page.get_text("words"):
            wx0, wy0, wx1, wy1, text = w[0], w[1], w[2], w[3], w[4]
            if text in ("A)", "B)", "C)", "D)", "E)"):
                continue
            wcx, wcy = (wx0 + wx1) / 2, (wy0 + wy1) / 2
            if any(b[0] - 35 <= wcx <= b[2] + 35 and b[1] - 45 <= wcy <= b[3] + 45 for b in imgs):
                c["x0"] = min(c["x0"], wx0 - 3)
                c["x1"] = max(c["x1"], wx1 + 3)
                c["y0"] = min(c["y0"], wy0 - 3)
                c["y1"] = max(c["y1"], wy1 + 3)

    for ri in range(2):
        L = cells[letter_at[(ri, 0)]]
        R = cells[letter_at[(ri, 1)]]
        if L["x1"] > R["x0"]:
            mid = (L["x1"] + R["x0"]) / 2
            L["x1"] = mid
            R["x0"] = mid
    for ci in range(2):
        T = cells[letter_at[(0, ci)]]
        B = cells[letter_at[(1, ci)]]
        if T["y1"] > B["y0"]:
            mid = (T["y1"] + B["y0"]) / 2
            T["y1"] = mid
            B["y0"] = mid

    bands = []
    for letter in "ABCD":
        if letter not in cells:
            continue
        c = cells[letter]
        c["x0"] = max(PAGE_MARGIN_X - 4, c["x0"])
        c["x1"] = min(right_x + 4, c["x1"])
        c["y0"] = max(stem_bottom + 0.5, c["y0"])
        c["y1"] = min(hard_end, c["y1"])
        if c["x1"] - c["x0"] < 50:
            if c["ci"] == 0:
                c["x0"], c["x1"] = PAGE_MARGIN_X, x_mid - 2
            else:
                c["x0"], c["x1"] = x_mid + 2, right_x
        if c["y1"] - c["y0"] < 36:
            c["y1"] = min(hard_end, c["y0"] + 50)
        bands.append({
            "letter": letter,
            "y0": c["y0"],
            "y1": c["y1"],
            "x0": c["x0"],
            "x1": c["x1"],
        })
    return bands


def compute_option_bounds(
    page: fitz.Page,
    markers: list[dict],
    ink_opts: list[dict],
    stem_bottom: float,
    hard_end: float,
) -> list[dict]:
    page_width = page.rect.width
    if is_grid_layout(markers):
        return grid_option_bounds(page, markers, stem_bottom, hard_end)
    bands = midpoint_bands(ink_opts, stem_bottom, hard_end)
    for band in bands:
        band["x0"] = PAGE_MARGIN_X
        band["x1"] = page_width - PAGE_MARGIN_X
    return bands


def find_questions(page: fitz.Page) -> list[dict]:
    lines = page_lines(page)
    words = page_words(page)
    if not lines:
        return []

    candidates = []
    for idx, (_x0, y0, _x1, y1, text) in enumerate(lines):
        m = NUM_ONLY_RE.match(text) or NUM_TEXT_RE.match(text)
        if not m:
            continue
        num = int(m.group(1))
        if 1 <= num <= 65:
            candidates.append({"num": num, "idx": idx, "y0": y0, "y1": y1})

    questions = []
    for i, cand in enumerate(candidates):
        start_idx = cand["idx"]
        end_idx = candidates[i + 1]["idx"] if i + 1 < len(candidates) else len(lines)
        block = lines[start_idx:end_idx]

        opts = []
        for _x0, y0, _x1, y1, text in block:
            m = OPTION_RE.match(text)
            if m:
                opts.append({"letter": m.group(1), "y0": y0, "y1": y1, "x0": _x0})
        if len(opts) < 4:
            continue

        by_letter = {}
        for opt in opts:
            # Preferir columna izquierda si hay duplicados
            prev = by_letter.get(opt["letter"])
            if prev is None or opt["x0"] < prev["x0"]:
                by_letter[opt["letter"]] = opt
        ordered = [by_letter[L] for L in "ABCDE" if L in by_letter][:4]
        if len(ordered) < 4:
            continue

        next_q_y = candidates[i + 1]["y0"] if i + 1 < len(candidates) else page.rect.height - 36
        footer_y = page.rect.height - 36
        for _x0, fy, _x1, _fy1, text in lines:
            if FOOTER_RE.match(text) and fy > ordered[0]["y0"]:
                footer_y = min(footer_y, fy)
                break
        hard_end = min(next_q_y - 4, footer_y - 6)

        ink_opts = expand_option_ink(page, words, ordered, hard_end)
        stem_bottom = ordered[0]["y0"] - 6

        for d in page.get_drawings():
            r = d.get("rect")
            if not r or r.height > 2 or r.width > 200:
                continue
            if r.y1 < cand["y0"] - 20 or r.y0 >= stem_bottom:
                continue
            stem_bottom = max(stem_bottom, min(r.y1 + 4, ordered[0]["y0"] - 4))

        for info in page.get_image_info(xrefs=True):
            x0, y0, x1, y1 = info["bbox"]
            if y1 <= cand["y0"] - 20 or y0 >= stem_bottom:
                continue
            if (y1 - y0) >= 40 or (x1 - x0) >= 80:
                stem_bottom = max(stem_bottom, min(y1 + 4, ordered[0]["y0"] - 4))

        stem_top = stem_top_from_spans(page, cand, stem_bottom)

        for d in page.get_drawings():
            r = d.get("rect")
            if not r or r.height > 2 or r.width > 200:
                continue
            if r.y1 < cand["y0"] - 20 or r.y0 >= stem_bottom:
                continue
            stem_top = min(stem_top, r.y0 - STEM_INK_PAD)

        for info in page.get_image_info(xrefs=True):
            x0, y0, x1, y1 = info["bbox"]
            if y1 <= cand["y0"] - 20 or y0 >= stem_bottom:
                continue
            if (y1 - y0) >= 40 or (x1 - x0) >= 80:
                if y0 >= cand["y0"] - 12:
                    stem_top = min(stem_top, y0 - 4)

        stem_top = max(0.0, stem_top)
        if stem_bottom - stem_top < 24:
            continue

        option_bounds = compute_option_bounds(page, ordered, ink_opts, stem_bottom, hard_end)

        questions.append({
            "num": cand["num"],
            "stem": {"y_top": stem_top, "y_bottom": max(stem_bottom, stem_top + 24)},
            "options": option_bounds,
        })
    return questions


def save_clip(
    page: fitz.Page,
    y0: float,
    y1: float,
    dest: Path,
    pad_px: int = 10,
    trim_header: bool = False,
    x0: float | None = None,
    x1: float | None = None,
) -> bool:
    rect = page.rect
    y0 = max(0.0, y0)
    y1 = min(rect.height - 2, y1)
    if y1 - y0 < 12:
        return False
    clip_x0 = PAGE_MARGIN_X if x0 is None else max(0.0, x0)
    clip_x1 = rect.width - PAGE_MARGIN_X if x1 is None else min(rect.width, x1)
    if clip_x1 - clip_x0 < 24:
        return False
    clip = fitz.Rect(clip_x0, y0, clip_x1, y1)
    pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(dest)
    if pad_px > 0 or trim_header:
        im = Image.open(dest).convert("RGB")
        if pad_px > 0:
            top_pad = pad_px + 12 if trim_header else pad_px
            im = ImageOps.expand(
                im, border=(0, top_pad, 0, pad_px), fill=(255, 255, 255)
            )
        if trim_header:
            im = trim_stem_header(im)
        im.save(dest, optimize=True)
    return True


def extract_pdf(test_id: str, year: str, filename: str) -> dict:
    path = pdf_path(filename)
    if not path:
        print(f"  skip {test_id} {year}: PDF no encontrado")
        return {}

    (ROOT / "data" / test_id / "figures").mkdir(parents=True, exist_ok=True)
    manifest = {}
    seen: set[int] = set()
    doc = fitz.open(path)
    for page_index in range(doc.page_count):
        page = doc[page_index]
        for q in find_questions(page):
            num = q["num"]
            if num in seen:
                continue
            stem_rel = f"data/{test_id}/figures/{year}-q{num:02d}.png"
            if not save_clip(
                page, q["stem"]["y_top"], q["stem"]["y_bottom"], ROOT / stem_rel,
                pad_px=20, trim_header=True,
            ):
                continue
            option_rels = []
            ok = True
            for opt in q["options"]:
                letter = opt["letter"].lower()
                rel = f"data/{test_id}/figures/{year}-q{num:02d}-{letter}.png"
                if not save_clip(
                    page,
                    opt["y0"],
                    opt["y1"],
                    ROOT / rel,
                    pad_px=16,
                    x0=opt.get("x0"),
                    x1=opt.get("x1"),
                ):
                    ok = False
                    break
                option_rels.append(rel)
            if not ok or len(option_rels) < 4:
                continue
            manifest[f"{year}-q{num:02d}"] = {
                "figure": stem_rel,
                "optionFigures": option_rels[:4],
            }
            seen.add(num)
    doc.close()
    print(f"  {test_id} {year}: {len(manifest)} preguntas")
    return manifest


def attach_to_bank(test_id: str, all_manifests: dict) -> int:
    bank_path = ROOT / "data" / test_id / "bank.json"
    if not bank_path.exists():
        return 0
    bank = json.loads(bank_path.read_text(encoding="utf-8"))
    linked = 0
    for q in bank.get("questions", []):
        year = str(q.get("year", ""))
        num = q.get("num")
        if not year or not num:
            continue
        key = f"{year}-q{int(num):02d}"
        entry = all_manifests.get(year, {}).get(key)
        if not entry:
            q.pop("figure", None)
            q.pop("optionFigures", None)
            q.pop("needsFigure", None)
            continue
        q["figure"] = entry["figure"]
        q["optionFigures"] = entry["optionFigures"]
        q["needsFigure"] = True
        linked += 1
    bank_path.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    return linked


def main():
    for test_id, years in PDF_MAP.items():
        manifests = {}
        for year, filename in years.items():
            manifests[year] = extract_pdf(test_id, year, filename)
        n = attach_to_bank(test_id, manifests)
        print(f"  {test_id}: {n} enlazadas")


if __name__ == "__main__":
    main()
