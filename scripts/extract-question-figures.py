# -*- coding: utf-8 -*-
"""Recorta enunciados oficiales PAES (sin alternativas ni pie de pagina)."""
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
    """(x0, y0, x1, y1, text) ordenados por y."""
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
    """Preguntas reales: numero + enunciado + alternativas A-D en el bloque."""
    lines = page_lines(page)
    if not lines:
        return []

    candidates = []
    for idx, (x0, y0, x1, y1, text) in enumerate(lines):
        m = NUM_ONLY_RE.match(text) or NUM_TEXT_RE.match(text)
        if not m:
            continue
        num = int(m.group(1))
        if num < 1 or num > 65:
            continue
        # Ignorar listas de instrucciones tipicas (numero a la izquierda, texto corto de reglas)
        if y0 < 95 and num <= 7 and "FORMA" in page.get_text()[:200]:
            # posible pagina intro; exigir alternativas mas abajo
            pass
        candidates.append({"num": num, "idx": idx, "x0": x0, "y0": y0, "y1": y1, "text": text})

    questions = []
    for i, cand in enumerate(candidates):
        start_idx = cand["idx"]
        end_idx = candidates[i + 1]["idx"] if i + 1 < len(candidates) else len(lines)
        block = lines[start_idx:end_idx]
        option_ys = []
        for _x0, y0, _x1, _y1, text in block:
            if OPTION_RE.match(text):
                option_ys.append(y0)
        # Solo aceptar si hay al menos A) (pregunta real, no item de instrucciones)
        if not option_ys:
            continue
        a_y = min(option_ys)
        # Contenido del enunciado: desde el numero hasta antes de A)
        content_bottom = a_y - 6
        # Incluir desde y0 del numero (no saltar la primera linea del enunciado)
        y_top = max(0.0, cand["y0"] - 2)
        if content_bottom - y_top < 28:
            continue
        questions.append({
            "num": cand["num"],
            "y_top": y_top,
            "y_bottom": content_bottom,
        })
    return questions


def extract_pdf(test_id: str, year: str, filename: str) -> dict[str, str]:
    path = pdf_path(filename)
    if not path:
        print(f"  skip {test_id} {year}: PDF no encontrado")
        return {}

    out_dir = ROOT / "data" / test_id / "figures"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}
    seen: set[int] = set()

    doc = fitz.open(path)
    for page_index in range(doc.page_count):
        page = doc[page_index]
        rect = page.rect
        for q in find_questions(page):
            num = q["num"]
            # Preferir la primera aparicion valida (evita dobles)
            if num in seen:
                continue
            y_top = q["y_top"]
            y_bottom = min(q["y_bottom"], rect.height - 50)  # evita pie "- N -"
            # También cortar si hay pie de pagina tipico
            for _x0, y0, _x1, _y1, text in page_lines(page):
                if FOOTER_RE.match(text) and y0 < y_bottom and y0 > y_top:
                    y_bottom = min(y_bottom, y0 - 8)
            if y_bottom - y_top < 28:
                continue
            clip = fitz.Rect(48, y_top, rect.width - 48, y_bottom)
            pix = page.get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip, alpha=False)
            rel = f"data/{test_id}/figures/{year}-q{num:02d}.png"
            pix.save(ROOT / rel)
            manifest[f"{year}-q{num:02d}"] = rel
            seen.add(num)
    doc.close()
    print(f"  {test_id} {year}: {len(manifest)} recortes (preguntas {sorted(seen)})")
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
            q.pop("figure", None)
            q.pop("needsFigure", None)
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
