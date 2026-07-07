# -*- coding: utf-8 -*-
"""Utilidades para generar preguntas de alternativa con respuesta verificada."""
import random
from typing import Callable, List, Optional, Tuple


def shuffle_mcq(correct: str, wrong: List[str]) -> Tuple[List[str], int]:
    opts = [correct] + wrong[:3]
    while len(opts) < 4:
        opts.append(f"Ninguna de las anteriores ({len(opts)})")
    random.shuffle(opts)
    return opts, opts.index(correct)


def make_q(
    test_id: str,
    idx: int,
    area: str,
    question: str,
    correct: str,
    wrong: List[str],
    explanation: str,
    difficulty: Optional[str] = None,
) -> dict:
    options, answer = shuffle_mcq(correct, wrong)
    return {
        "id": f"{test_id}-gen-{idx:05d}",
        "area": area,
        "question": question,
        "options": options,
        "answer": answer,
        "answerKey": chr(65 + answer),
        "explanation": explanation,
        "difficulty": difficulty or random.choice(["Facil", "Medio", "Medio", "Dificil"]),
        "source": "generado",
        "countsForScore": True,
    }


def fill_pool(test_id: str, generators: List[Tuple[str, Callable[[], Optional[dict]]]], target: int) -> List[dict]:
    out: List[dict] = []
    idx = 1
    attempts = 0
    max_attempts = target * 30
    while len(out) < target and attempts < max_attempts:
        attempts += 1
        area, gen = random.choice(generators)
        q = gen()
        if not q:
            continue
        q["id"] = f"{test_id}-gen-{idx:05d}"
        q["area"] = area
        q.setdefault("source", "generado")
        q.setdefault("countsForScore", True)
        out.append(q)
        idx += 1
    return out
