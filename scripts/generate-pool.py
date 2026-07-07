#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera data/{test}/pool.json con 1000+ preguntas verificadas por prueba."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from generators.ciencias import generate_ciencias
from generators.cl import generate_cl
from generators.hcs import generate_hcs
from generators.math_m1 import generate_m1
from generators.math_m2 import generate_m2

TARGET = 1020

GENERATORS = {
    "m1": generate_m1,
    "m2": generate_m2,
    "cl": generate_cl,
    "hcs": generate_hcs,
    "ciencias": generate_ciencias,
}


def main():
    for test_id, gen_fn in GENERATORS.items():
        out_dir = ROOT / "data" / test_id
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"Generando {test_id} ({TARGET} preguntas)...", flush=True)
        questions = gen_fn(TARGET)
        payload = {
            "testId": test_id,
            "version": 1,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "count": len(questions),
            "target": TARGET,
            "questions": questions,
        }
        out_path = out_dir / "pool.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        size_kb = out_path.stat().st_size // 1024
        print(f"  -> {len(questions)} preguntas ({size_kb} KB) -> {out_path}")


if __name__ == "__main__":
    main()
