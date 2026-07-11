# -*- coding: utf-8 -*-
import math
import random
from math import comb
from .common import fill_pool, shuffle_mcq
from .math_m1 import _circle_area, _function_eval, _linear_eq, _mean, _pythagoras, _power_rule, _triangle_angle

def _log_value():
    base = random.choice([10, 2])
    exp = random.randint(1, 4)
    val = base ** exp
    wrong = [str(val + d) for d in random.sample([1, -1, base], 3)]
    opts, ai = shuffle_mcq(str(exp), wrong)
    return {"question": f"log_{base}({val})?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"{base}^{exp}={val}", "difficulty": "Medio",
            "topic": "logaritmos"}

def _log_product():
    correct = "log a + log b"
    wrong = ["log(a+b)", "log a * log b", "log(a-b)"]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": "Propiedad de log(a*b)?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": "log(ab)=log a+log b", "difficulty": "Medio",
            "topic": "logaritmos"}

def _sin_cos():
    angles = {30: (0.5, 0.866), 45: (0.707, 0.707), 60: (0.866, 0.5)}
    ang = random.choice(list(angles.keys()))
    fn = random.choice(["sin", "cos"])
    val = angles[ang][0 if fn == "sin" else 1]
    correct = f"{val:.3f}"
    wrong = [f"{val+d:.3f}" for d in random.sample([0.1, -0.1, 0.2], 3)]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"{fn}({ang} grados) aprox?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": correct, "difficulty": "Medio",
            "topic": "trig"}

def _cylinder_volume():
    r, h = random.randint(2, 8), random.randint(5, 15)
    ans = int(round(math.pi * r * r * h, 0))
    wrong = [str(ans + d) for d in random.sample([50, -50, 100], 3)]
    opts, ai = shuffle_mcq(f"{ans} cm3", [f"{w} cm3" for w in wrong])
    return {"question": f"Cilindro r={r} h={h}. Volumen?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"V=pi*r^2*h ~ {ans}", "difficulty": "Medio",
            "topic": "volumen"}

def _sphere_volume():
    r = random.randint(2, 9)
    ans = int(round(4 / 3 * math.pi * r ** 3, 0))
    wrong = [str(int(4 * math.pi * r * r)), str(int(math.pi * r ** 3)), str(int(ans * 1.5))]
    opts, ai = shuffle_mcq(f"{ans} cm3", [f"{w} cm3" for w in wrong])
    return {"question": f"Esfera r={r}. Volumen aprox?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"V=(4/3)pi*r^3 ~ {ans}", "difficulty": "Dificil",
            "topic": "volumen"}

def _quadratic_discriminant():
    b, c = random.randint(-10, 10), random.randint(-10, 10)
    d = b * b - 4 * c
    nature = "dos raices reales" if d > 0 else ("una raiz doble" if d == 0 else "ninguna raiz real")
    wrong = [x for x in ["dos raices reales", "una raiz doble", "ninguna raiz real"] if x != nature]
    opts, ai = shuffle_mcq(nature, wrong)
    sb = f"+ {b}x" if b >= 0 else f"- {abs(b)}x"
    sc = f"+ {c}" if c >= 0 else f"- {abs(c)}"
    return {"question": f"Raices reales de x^2 {sb} {sc}=0? (delta={d})", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"delta={d} -> {nature}", "difficulty": "Dificil",
            "topic": "cuadratic"}

def _exponential():
    base, exp = random.choice([2, 3, 5]), random.randint(2, 6)
    ans = base ** exp
    wrong = [str(base ** (exp + d)) for d in random.sample([-1, 1, 2], 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"{base}^{exp}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": str(ans), "difficulty": "Facil",
            "topic": "exponencial"}

def _permutation_simple():
    n = random.randint(5, 9)
    ans = n * (n - 1)
    wrong = [str(n ** 2), str(n + n - 1), str(n * 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"P({n},2)?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"{n}*{n-1}={ans}", "difficulty": "Dificil",
            "topic": "probabilidad"}

def _binomial_prob():
    n, k = 3, random.randint(1, 2)
    correct = f"{comb(n,k)}/{2**n}"
    wrong = [f"{k}/{n}", f"1/{2**n}", f"{n}/{2**k}"]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"3 monedas: P({k} caras)?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": correct, "difficulty": "Dificil",
            "topic": "probabilidad"}

def generate_m2(target=1000):
    gens = [
        ("Numeros avanzados", _exponential), ("Numeros avanzados", _power_rule),
        ("Numeros avanzados", _log_value), ("Numeros avanzados", _log_product),
        ("Algebra y funciones", _linear_eq), ("Algebra y funciones", _function_eval),
        ("Algebra y funciones", _quadratic_discriminant), ("Algebra y funciones", _sin_cos),
        ("Geometria", _pythagoras), ("Geometria", _triangle_angle), ("Geometria", _circle_area),
        ("Geometria", _cylinder_volume), ("Geometria", _sphere_volume),
        ("Probabilidad y estadistica", _mean), ("Probabilidad y estadistica", _permutation_simple),
        ("Probabilidad y estadistica", _binomial_prob),
    ]
    random.seed(43)
    return fill_pool("m2", gens, target)
