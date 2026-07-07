# -*- coding: utf-8 -*-
"""Extrae recortes PNG por pregunta desde PDFs PAES oficiales (figuras, graficos, rectas)."""
from __future__ import annotations

import json
import re
from pathlib import Path

import fitz

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

VISUAL_HINT = re.compile(
    r"recta num|figura|gr[a\u00e1]fico|tabla|imagen|diagrama|cuadr[i\u00ed]cula|plano cartesiano|"
    r"vectores representados|observa la siguiente|figura adjunta",
    re.I,
)
GARBLED_HINT = re.compile(
    r"\d{3,}\s+\d+\s*:\s*\d+|\boperaci[o\u00f3]n\s+\d{2}\s+usando",
    re.I,
)

ZOOM = 2.0


def pdf_path(filename: str) -> Path | None:
    for base in (CONTENIDOS, ASSETS):
        p = base / filename
        if p.exists():
            return p
    return None


def question_starts(page: fitz.Page) -> list[tuple[int, float, float]]:
    found: dict[int, tuple[float, float]] = {}
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
            m = re.match(r"^(\d{1,2})\.\s*", text)
            if not m:
                continue
            num = int(m.group(1))
            if num < 1 or num > 65:
                continue
            y0, y1 = line["bbox"][1], line["bbox"][3]
            if num not in found or y0 < found[num][0]:
                found[num] = (y0, y1)
    return sorted(((n, y0, y1) for n, (y0, y1) in found.items()), key=lambda x: x[1])


def option_a_y(page: fitz.Page, y_start: float, y_end: float) -> float | None:
    data = page.get_text("dict")
    best = None
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            y0 = line["bbox"][1]
            if y0 < y_start or y0 > y_end:
                continue
            text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
            if re.match(r"^A\)\s", text):
                if best is None or y0 < best:
                    best = y0
    return best


def crop_question(page: fitz.Page, y0: float, y1: float, y_next: float) -> fitz.Rect:
    rect = page.rect
    margin_x = 72
    y_top = max(0, y1 + 2)
    y_bottom = min(rect.height, y_next - 6)
    a_y = option_a_y(page, y_top, y_bottom)
    if a_y is not None:
        y_bottom = min(y_bottom, a_y - 4)
    if y_bottom - y_top < 40:
        y_bottom = min(rect.height, y_top + 120)
    return fitz.Rect(margin_x, y_top, rect.width - margin_x, y_bottom)


def extract_pdf(test_id: str, year: str, filename: str) -> dict[str, str]:
    path = pdf_path(filename)
    if not path:
        print(f"  skip {test_id} {year}: PDF no encontrado")
        return {}

    out_dir = ROOT / "data" / test_id / "figures"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}

    doc = fitz.open(path)
    for page_index in range(doc.page_count):
        page = doc[page_index]
        starts = question_starts(page)
        if not starts:
            continue
        for i, (num, y0, y1) in enumerate(starts):
            y_next = starts[i + 1][1] if i + 1 < len(starts) else page.rect.height - 40
            clip = crop_question(page, y0, y1, y_next)
            if clip.height < 30 or clip.width < 50:
                continue
            pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip, alpha=False)
            rel = f"data/{test_id}/figures/{year}-q{num:02d}.png"
            dest = ROOT / rel
            pix.save(dest)
            manifest[f"{year}-q{num:02d}"] = rel
    doc.close()
    print(f"  {test_id} {year}: {len(manifest)} recortes")
    return manifest


def attach_figures_to_bank(test_id: str, all_manifests: dict[str, dict[str, str]]) -> int:
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
        rel = all_manifests.get(year, {}).get(key)
        if not rel:
            continue
        q["figure"] = rel
        text = q.get("question", "")
        q["needsFigure"] = bool(VISUAL_HINT.search(text) or GARBLED_HINT.search(text))
        linked += 1
    bank_path.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    return linked


def main():
    for test_id, years in PDF_MAP.items():
        manifests: dict[str, dict[str, str]] = {}
        for year, filename in years.items():
            manifests[year] = extract_pdf(test_id, year, filename)
        n = attach_figures_to_bank(test_id, manifests)
        print(f"  {test_id}: {n} preguntas enlazadas en bank.json")


if __name__ == "__main__":
    main()
