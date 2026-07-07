# -*- coding: utf-8 -*-
"""Extrae preguntas de PDFs PAES y clavijeros DEMRE -> data/{test}/bank.json"""
import json
import re
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CONTENIDOS = ROOT / "assets" / "contenidos"

TESTS = {
    "m1": {
        "questions": 65,
        "scored": 60,
        "options": 4,
        "areas_by_num": [
            (16, "Numeros"),
            (33, "Algebra y funciones"),
            (50, "Geometria"),
            (65, "Probabilidad y estadistica"),
        ],
        "sources": [
            {"year": "2025", "prueba": "2025-24-12-04-paes-regular-matematica1-p2025.pdf", "clavijero": "2025-25-01-06-clavijero-paes-regular-m1.pdf"},
            {"year": "2026", "prueba": "2026-25-12-03-paes-regular-matematica1-p2026.pdf", "clavijero": "2026-26-01-05-clavijero-paes-regular-m1.pdf"},
        ],
        "temario": "2027-26-03-19-temario-paes-regular-m1.pdf",
    },
    "m2": {
        "questions": 55,
        "scored": 50,
        "options": 4,
        "areas_by_num": [
            (14, "Numeros avanzados"),
            (28, "Algebra y funciones"),
            (42, "Geometria"),
            (55, "Probabilidad y estadistica"),
        ],
        "sources": [
            {"year": "2025", "prueba": "2025-24-12-02-paes-regular-matematica2-p2025.pdf", "clavijero": "2025-25-01-06-clavijero-paes-regular-m2.pdf"},
            {"year": "2026", "prueba": "2026-25-12-01-paes-regular-matematica2-p2026.pdf", "clavijero": "2026-26-01-05-clavijero-paes-regular-m2.pdf"},
        ],
        "temario": "2027-26-03-19-temario-paes-regular-m2.pdf",
    },
    "cl": {
        "questions": 65,
        "scored": 60,
        "options": 4,
        "areas_by_num": [
            (16, "Localizar"),
            (33, "Interpretar"),
            (49, "Evaluar"),
            (65, "Integrar"),
        ],
        "sources": [
            {"year": "2025", "prueba": "2025-24-12-03-paes-regular-competencia-lectora-p2025.pdf", "clavijero": "2025-25-01-06-clavijero-paes-regular-competencia-lectora.pdf"},
            {"year": "2026", "prueba": "2026-25-12-02-paes-regular-competencia-lectora-p2026.pdf", "clavijero": "2026-26-01-05-clavijero-paes-regular-competencia-lectora.pdf"},
        ],
        "temario": "2027-26-03-19-temario-paes-regular-competencia-lectora.pdf",
    },
    "hcs": {
        "questions": 65,
        "scored": 60,
        "options": 4,
        "areas_by_num": [
            (22, "Historia"),
            (44, "Geografia"),
            (65, "Educacion ciudadana"),
        ],
        "sources": [
            {"year": "2025", "prueba": "2025-24-12-04-paes-regular-historia-p2025.pdf", "clavijero": "2025-25-01-06-clavijero-paes-regular-historia.pdf"},
            {"year": "2026", "prueba": "2026-25-12-03-paes-regular-historia-p2026.pdf", "clavijero": "2026-26-01-05-clavijero-paes-regular-historia.pdf"},
        ],
        "temario": "2027-26-03-19-temario-paes-regular-historia.pdf",
    },
}


def pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join((p.extract_text() or "") for p in reader.pages)


def area_for_num(num: int, ranges) -> str:
    for limit, name in ranges:
        if num <= limit:
            return name
    return ranges[-1][1]


def parse_clavijero(text: str, max_q: int):
    answers = {}
    excluded = set()
    for m in re.finditer(r"(\d{1,2})\s*(\*?)\s+([A-E])\b", text):
        num = int(m.group(1))
        if num < 1 or num > max_q:
            continue
        if m.group(2) == "*":
            excluded.add(num)
        answers[num] = m.group(3)
    for m in re.finditer(r"(\d{1,2})\*", text):
        excluded.add(int(m.group(1)))
    return answers, sorted(excluded)


def parse_transform_table(text: str) -> dict:
    table = {}
    for p, paes in re.findall(r"\b(\d{1,2})\s+(\d{3,4})\b", text):
        pi = int(p)
        if pi <= 65:
            table[str(pi)] = int(paes)
    return table


def format_chilean_digits(raw: str) -> str:
    digits = raw.replace(" ", "")
    decimal = None
    if "," in digits:
        digits, decimal = digits.split(",", 1)
    digits = digits.replace(".", "")
    grouped = re.sub(r"(?<=\d)(?=(\d{3})+(?!\d))", ".", digits)
    return f"{grouped},{decimal}" if decimal is not None else grouped


def format_chilean_numbers(text: str) -> str:
    text = re.sub(
        r"\$(\d{1,3}(?:\s\d{3})+(?:,\d+)?|\d{4,}(?:,\d+)?)",
        lambda m: f"${format_chilean_digits(m.group(1))}",
        text,
    )
    text = re.sub(
        r"(?<=[\s=+\-*/(,])(\d{1,3}(?:\s\d{3})+)(?=[\s.,;:?)\]]|$)",
        lambda m: format_chilean_digits(m.group(1)),
        text,
    )
    return text


def clean_text(s: str) -> str:
    s = re.sub(r"\s*FORMA\s+\d+.*", "", s, flags=re.I)
    s = re.sub(r"\s*LECTURA\s+\d+.*", "", s, flags=re.I)
    s = re.sub(r"[\uF000-\uF0FF]", "", s)
    s = re.sub(r"\s*[-\u2013]\s*\d+\s*[-\u2013](?:\s*.*)?$", "", s)
    s = re.sub(r"(\d+(?:[.,]\d+)?)\s*(g|kg|mg|ml|cm|mm)de\b", r"\1 \2 de", s, flags=re.I)
    s = re.sub(r"(\$[\d\s.,]+)([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1])", r"\1 \2", s, flags=re.I)
    s = re.sub(r"([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1)])(\$)", r"\1 \2", s, flags=re.I)
    s = format_chilean_numbers(s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def parse_questions(text: str, max_options: int = 4):
    text = re.sub(r"Registro de Propiedad Intelectual.*", "", text, flags=re.I)
    parts = re.split(r"\n\s*(\d{1,2})\.\s+", text)
    out = []
    letters = ["A", "B", "C", "D", "E"][:max_options]
    for i in range(1, len(parts), 2):
        if i + 1 >= len(parts):
            break
        num = int(parts[i])
        body = parts[i + 1]
        opts = []
        for letter in letters:
            m = re.search(
                rf"{letter}\)\s*(.+?)(?=\n\s*[A-E]\)|\n\s*\d{{1,2}}\.\s|\Z)",
                body,
                re.S,
            )
            if m:
                opts.append(clean_text(m.group(1)))
        if len(opts) < 4:
            continue
        first = body.find("A)")
        qtext = clean_text(body[:first] if first > 0 else body.split("A)")[0])
        if len(qtext) < 15:
            continue
        out.append({"num": num, "question": qtext, "options": opts[:max_options]})
    return out


def build_test(test_id: str, cfg: dict) -> dict:
    all_questions = []
    clavijeros = {}
    transform = {}

    for src in cfg["sources"]:
        year = src["year"]
        clav_path = CONTENIDOS / src["clavijero"]
        prueba_path = CONTENIDOS / src["prueba"]
        if not clav_path.exists() or not prueba_path.exists():
            print(f"  skip {year}: missing files")
            continue

        clav_text = pdf_text(clav_path)
        answers, excluded = parse_clavijero(clav_text, cfg["questions"])
        clavijeros[year] = {
            "answers": {str(k): v for k, v in sorted(answers.items())},
            "excluded": excluded,
        }
        transform[year] = parse_transform_table(clav_text)

        parsed = parse_questions(pdf_text(prueba_path), cfg.get("options", 4))
        for q in parsed:
            key = answers.get(q["num"])
            if not key:
                continue
            all_questions.append({
                "id": f"{test_id}-{year}-q{q['num']:02d}",
                "num": q["num"],
                "year": year,
                "area": area_for_num(q["num"], cfg["areas_by_num"]),
                "question": q["question"],
                "options": q["options"],
                "answer": ord(key) - ord("A"),
                "answerKey": key,
                "countsForScore": q["num"] not in excluded,
                "source": f"PAES {year}",
                "difficulty": "Oficial",
            })

    return {
        "testId": test_id,
        "totalQuestions": cfg["questions"],
        "scoredQuestions": cfg["scored"],
        "temario": cfg.get("temario"),
        "clavijeros": clavijeros,
        "transformTables": transform,
        "questions": all_questions,
        "generatedFrom": "PAES oficial DEMRE + clavijero",
    }


def main():
    for test_id, cfg in TESTS.items():
        print(f"Building {test_id}...")
        bank = build_test(test_id, cfg)
        out = ROOT / "data" / test_id / "bank.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(bank, ensure_ascii=False, indent=2))
        print(f"  {len(bank['questions'])} questions -> {out}")


if __name__ == "__main__":
    main()
