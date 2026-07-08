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


def column_x_bounds(marker: dict, row: list[dict], page_width: float) -> tuple[float, float]:
    """Limites horizontales de una celda en una fila de alternativas."""
    right_x = page_width - PAGE_MARGIN_X
    if len(row) == 1:
        return PAGE_MARGIN_X, right_x
    xs = [m["x0"] for m in row]
    mids = [(xs[i] + xs[i + 1]) / 2 for i in range(len(xs) - 1)]
    idx = next(i for i, m in enumerate(row) if m["letter"] == marker["letter"])
    if idx == 0:
        return PAGE_MARGIN_X, mids[0]
    if idx == len(row) - 1:
        return mids[-1], right_x
    return mids[idx - 1], mids[idx]


def cell_ink_bottom(
    page: fitz.Page, x0: float, x1: float, y0: float, y1_limit: float
) -> float:
    """Borde inferior de tinta dentro de una celda de alternativa."""
    bottom = y0
    for d in page.get_drawings():
        r = d.get("rect")
        if not r:
            continue
        cx = (r.x0 + r.x1) / 2
        cy = (r.y0 + r.y1) / 2
        if x0 <= cx <= x1 and y0 - 8 <= cy <= y1_limit + 50:
            bottom = max(bottom, r.y1)
    for info in page.get_image_info(xrefs=True):
        bx = info["bbox"]
        cx = (bx[0] + bx[2]) / 2
        cy = (bx[1] + bx[3]) / 2
        if x0 <= cx <= x1 and y0 - 8 <= cy <= y1_limit + 50:
            bottom = max(bottom, bx[3])
    for w in page.get_text("words"):
        cx = (w[0] + w[2]) / 2
        cy = (w[1] + w[3]) / 2
        if x0 <= cx <= x1 and y0 - 8 <= cy <= y1_limit + 50:
            bottom = max(bottom, w[3])
    return bottom


def grid_option_bounds(
    page: fitz.Page,
    markers: list[dict],
    stem_bottom: float,
    hard_end: float,
) -> list[dict]:
    """Recorte por celda cuando A,B y C,D comparten fila (graficos 2x2)."""
    rows = cluster_option_rows(markers)
    page_width = page.rect.width
    row_centers = [
        sum((m["y0"] + m["y1"]) / 2 for m in row) / len(row) for row in rows
    ]
    bands: list[dict] = []
    for ri, row in enumerate(rows):
        if ri == 0:
            y0 = stem_bottom + 0.5
        else:
            y0 = (row_centers[ri - 1] + row_centers[ri]) / 2
        if ri + 1 < len(rows):
            y1 = (row_centers[ri] + row_centers[ri + 1]) / 2
        else:
            y1 = row_centers[ri] + 60

        y0 = max(stem_bottom + 0.5, min(m["y0"] for m in row) - OPT_EDGE_PAD)

        ink_y1 = y0 + 30
        row_ink_limit = (
            y1
            if ri + 1 < len(rows)
            else min(hard_end, min(m["y0"] for m in row) + 140)
        )
        for m in row:
            x0, x1 = column_x_bounds(m, row, page_width)
            ink_bottom = cell_ink_bottom(page, x0, x1, m["y0"] - 4, row_ink_limit)
            ink_y1 = max(ink_y1, ink_bottom + OPT_EDGE_PAD)

        y1 = min(hard_end, max(y1, ink_y1))
        if y1 - y0 < 22:
            y1 = min(hard_end, y0 + 26)

        for m in row:
            x0, x1 = column_x_bounds(m, row, page_width)
            bands.append({
                "letter": m["letter"],
                "y0": y0,
                "y1": y1,
                "x0": x0,
                "x1": x1,
            })
    bands.sort(key=lambda b: "ABCD".index(b["letter"]))
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
