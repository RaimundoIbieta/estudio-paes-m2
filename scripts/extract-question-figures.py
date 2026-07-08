# -*- coding: utf-8 -*-
"""Recorta enunciado + cada alternativa A-D desde PDFs PAES oficiales."""
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
    r"vectores representados|observa la siguiente|figura adjunta|precios:|"
    r"se presenta|adjunta|representa",
    re.I,
)
GARBLED_HINT = re.compile(
    r"\d{3,}\s+\d+\s*:\s*\d+|\boperaci[o\u00f3]n\s+\d{2}\s+usando",
    re.I,
)

ZOOM = 2.2
FOOTER_RE = re.compile(r"^-\s*\d+\s*-$")
NUM_ONLY_RE = re.compile(r"^(\d{1,2})\.\s*$")
NUM_TEXT_RE = re.compile(r"^(\d{1,2})\.\s+\S+")
OPTION_RE = re.compile(r"^([A-E])\)")


def pdf_path(filename: str) -> Path | None:
    for base in (CONTENIDOS, ASSETS):
        p = base / filename
        if p.exists():
            return p
    return None


def page_lines(page: fitz.Page) -> list[tuple[float, float, float, float, str]]:
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


def find_questions(page: fitz.Page) -> list[dict]:
    lines = page_lines(page)
    if not lines:
        return []

    candidates = []
    for idx, (x0, y0, x1, y1, text) in enumerate(lines):
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
                opts.append({"letter": m.group(1), "y0": y0, "y1": y1})
        if len(opts) < 4:
            continue

        # Deduplicate letters keeping first occurrence
        by_letter = {}
        for opt in opts:
            by_letter.setdefault(opt["letter"], opt)
        ordered = [by_letter[L] for L in "ABCDE" if L in by_letter][:4]
        if len(ordered) < 4:
            continue

        a_y = ordered[0]["y0"]
        stem_bottom = a_y - 6
        y_top = max(0.0, cand["y0"] - 2)
        if stem_bottom - y_top < 28:
            continue

        # End of last option: next option start, next question, or footer
        next_q_y = candidates[i + 1]["y0"] if i + 1 < len(candidates) else page.rect.height - 40
        option_bounds = []
        for j, opt in enumerate(ordered):
            y0 = opt["y0"] - 2
            if j + 1 < len(ordered):
                y1 = ordered[j + 1]["y0"] - 4
            else:
                y1 = min(next_q_y - 8, page.rect.height - 50)
                for _x0, fy, _x1, _fy1, text in block:
                    if FOOTER_RE.match(text) and fy > y0:
                        y1 = min(y1, fy - 8)
                        break
            if y1 - y0 < 16:
                y1 = y0 + 28
            option_bounds.append({"letter": opt["letter"], "y0": y0, "y1": y1})

        questions.append({
            "num": cand["num"],
            "stem": {"y_top": y_top, "y_bottom": stem_bottom},
            "options": option_bounds,
        })
    return questions


def save_clip(page: fitz.Page, y0: float, y1: float, dest: Path) -> bool:
    rect = page.rect
    y0 = max(0.0, y0)
    y1 = min(rect.height - 8, y1)
    if y1 - y0 < 14:
        return False
    clip = fitz.Rect(48, y0, rect.width - 48, y1)
    pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(dest)
    return True


def extract_pdf(test_id: str, year: str, filename: str) -> dict:
    path = pdf_path(filename)
    if not path:
        print(f"  skip {test_id} {year}: PDF no encontrado")
        return {}

    out_dir = ROOT / "data" / test_id / "figures"
    out_dir.mkdir(parents=True, exist_ok=True)
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
            if not save_clip(page, q["stem"]["y_top"], q["stem"]["y_bottom"], ROOT / stem_rel):
                continue
            option_rels = []
            ok = True
            for opt in q["options"]:
                letter = opt["letter"].lower()
                rel = f"data/{test_id}/figures/{year}-q{num:02d}-{letter}.png"
                if not save_clip(page, opt["y0"], opt["y1"], ROOT / rel):
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
    print(f"  {test_id} {year}: {len(manifest)} preguntas con enunciado+opciones")
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
        text = q.get("question", "")
        q["needsFigure"] = True  # oficial con imagen: preferir visual
        if not VISUAL_HINT.search(text) and not GARBLED_HINT.search(text):
            # aun asi usar figuras de opciones siempre
            q["needsFigure"] = bool(q.get("figure"))
        linked += 1
    bank_path.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    return linked


def main():
    for test_id, years in PDF_MAP.items():
        manifests = {}
        for year, filename in years.items():
            manifests[year] = extract_pdf(test_id, year, filename)
        n = attach_to_bank(test_id, manifests)
        print(f"  {test_id}: {n} preguntas enlazadas")


if __name__ == "__main__":
    main()
