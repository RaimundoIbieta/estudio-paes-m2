# -*- coding: utf-8 -*-
import math
import random
from fractions import Fraction
from .common import fill_pool, shuffle_mcq

def _pct_of_number():
    n = random.choice([80, 100, 120, 150, 200, 240, 300, 400, 500, 600, 800, 1000])
    p = random.choice([5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75])
    ans = n * p // 100
    wrong = [str(n * (p + d) // 100) for d in random.sample([-5, 5, 10, -10, 15], 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"Cuantos es el {p}% de {n}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"{p}% de {n} = {ans}.", "difficulty": "Facil",
            "topic": "porcentaje"}

def _discount():
    price = random.choice([8000, 12000, 15000, 20000, 25000, 30000, 40000, 50000])
    d = random.choice([10, 15, 20, 25, 30, 40])
    ans = price * (100 - d) // 100
    wrong = [str(price * (100 - d + k) // 100) for k in random.sample([5, -5, 10], 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"Producto ${price} con {d}% descuento. Precio final?", "options": [f"${o}" for o in opts],
            "answer": ai, "answerKey": chr(65 + ai), "explanation": f"{price}*(1-{d}/100)={ans}.", "difficulty": "Medio",
            "topic": "porcentaje"}

def _power_rule():
    base = random.choice([2, 3, 5])
    a, b = random.randint(2, 7), random.randint(2, 7)
    ans = base ** (a + b)
    wrong = [str(base ** (a + b + d)) for d in random.sample([1, -1, 2], 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"Valor de {base}^{a} * {base}^{b}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"{base}^{a+b}={ans}.", "difficulty": "Facil",
            "topic": "potencias"}

def _linear_eq():
    x = random.randint(-12, 12)
    a = random.choice([i for i in range(-9, 10) if i not in (0, 1)])
    b = random.randint(-20, 20)
    c = a * x + b
    sb = f"+ {b}" if b >= 0 else f"- {abs(b)}"
    wrong = [str(x + d) for d in random.sample([-3, -2, -1, 1, 2, 3], 3)]
    opts, ai = shuffle_mcq(str(x), wrong)
    return {"question": f"Resuelve: {a}x {sb} = {c}", "options": [f"x = {o}" for o in opts],
            "answer": ai, "answerKey": chr(65 + ai), "explanation": f"x={x}.", "difficulty": "Medio",
            "topic": "ecuaciones"}

def _pythagoras():
    triples = [(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (6, 8, 10)]
    a, b, c = random.choice(triples)
    if random.random() < 0.5:
        a, b = b, a
    if random.random() < 0.6:
        ans, wrong = c, [str(v) for v in random.sample([a, b, a + b, c + 1], 3)]
        q = f"Triangulo rectangulo catetos {a} y {b} cm. Hipotenusa?"
        expl = f"c^2={a}^2+{b}^2={c}^2"
    else:
        ans = b
        other, hyp = a, c
        wrong = [str(v) for v in [other, hyp, other + 1, max(1, ans - 2)]]
        q = f"Hipotenusa {hyp} cm, cateto {other} cm. Otro cateto?"
        expl = f"Cateto={ans}"
    opts, ai = shuffle_mcq(f"{ans} cm", [f"{w} cm" for w in wrong])
    return {"question": q, "options": opts, "answer": ai, "answerKey": chr(65 + ai), "explanation": expl,
            "difficulty": "Medio", "topic": "pitagoras"}

def _rectangle_area():
    b, h = random.randint(3, 25), random.randint(3, 20)
    ans = b * h
    wrong = [str(ans + d) for d in random.sample([-3, 3, b + h], 3)]
    opts, ai = shuffle_mcq(f"{ans} cm\u00b2", [f"{w} cm\u00b2" for w in wrong])
    return {"question": f"\u00c1rea rect\u00e1ngulo base {b} altura {h}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"{b}*{h}={ans}", "difficulty": "Facil",
            "topic": "areas"}

def _mean():
    data = [random.randint(1, 20) for _ in range(random.randint(4, 7))]
    ans = sum(data) / len(data)
    correct = str(int(ans)) if ans == int(ans) else f"{ans:.1f}"
    wrong = [str(int(ans + d)) if (ans + d) == int(ans + d) else f"{ans + d:.1f}" for d in random.sample([1, -1, 2, -2], 3)]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"Promedio de {data}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"suma/n={correct}", "difficulty": "Medio",
            "topic": "estadistica"}

def _median():
    data = sorted([random.randint(1, 30) for _ in range(random.choice([4, 5, 6]))])
    n = len(data)
    med = (data[n // 2 - 1] + data[n // 2]) / 2 if n % 2 == 0 else data[n // 2]
    correct = str(int(med)) if med == int(med) else f"{med:.1f}"
    wrong = [str(data[0]), str(data[-1]), str(int(sum(data) / n))]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"Mediana de {data}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"mediana={correct}", "difficulty": "Medio",
            "topic": "estadistica"}

def _dice_probability():
    k = random.randint(1, 5)
    correct = f"{k}/6"
    wrong = [f"{k}/{d}" for d in random.sample([4, 5, 8], 3)]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"Dado justo: P(numero <= {k})?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"{k} de 6", "difficulty": "Facil",
            "topic": "probabilidad"}

def _proportion():
    """Proporcion inversa (obreros/dias): a*b = c*x => x = a*b/c."""
    a = random.randint(2, 12)
    b = random.randint(3, 24)
    divisors = [d for d in range(2, 16) if d != a and (a * b) % d == 0]
    if not divisors:
        return None
    c = random.choice(divisors)
    x = (a * b) // c
    if x <= 0 or x == b:
        return None
    # Distractor tipico: tratarla como directa (multiplicar cruzado mal)
    direct = (b * c) // a if a and (b * c) % a == 0 else b * c
    wrong_vals = {direct, x + 2, max(1, x - 2), a + b, b + c}
    wrong_vals.discard(x)
    wrong = [f"{w} dias" for w in list(wrong_vals)[:3]]
    while len(wrong) < 3:
        wrong.append(f"{x + len(wrong) + 3} dias")
    opts, ai = shuffle_mcq(f"{x} dias", wrong)
    return {
        "question": (
            f"Si {a} obreros terminan un trabajo en {b} dias, "
            f"cuantos dias tardaran {c} obreros (mismo ritmo)?"
        ),
        "options": opts,
        "answer": ai,
        "answerKey": chr(65 + ai),
        "explanation": f"Proporcion inversa: {a}*{b}={c}*x => x={x} dias.",
        "difficulty": "Medio",
        "topic": "proporcionalidad",
    }

def _function_eval():
    a, b, x = random.randint(-5, 5), random.randint(-10, 10), random.randint(-6, 6)
    ans = a * x + b
    sb = f"+ {b}" if b >= 0 else f"- {abs(b)}"
    wrong = [str(ans + d) for d in random.sample([-4, 4, 2], 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"f(x)={a}x {sb}. f({x})?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": f"f({x})={ans}", "difficulty": "Medio",
            "topic": "funciones"}

def _fraction_add():
    d = random.choice([2, 3, 4, 5, 6, 8, 10, 12])
    n1, n2 = random.randint(1, d - 1), random.randint(1, d - 1)
    f = Fraction(n1, d) + Fraction(n2, d)
    correct = f"{f.numerator}/{f.denominator}" if f.denominator != 1 else str(f.numerator)
    wrong = [f"{n1 + n2}/{d}", f"{n1}/{d + n2}", f"{n1 * n2}/{d}"]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"{n1}/{d} + {n2}/{d}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": correct, "difficulty": "Facil",
            "topic": "fracciones"}

def _circle_area():
    r = random.randint(2, 12)
    ans = round(math.pi * r * r, 1)
    correct = f"{ans:.1f}"
    wrong = [f"{round(math.pi * (r + d) ** 2, 1):.1f}" for d in random.sample([1, -1, 2], 3)]
    opts, ai = shuffle_mcq(f"{correct} cm\u00b2", [f"{w} cm\u00b2" for w in wrong])
    return {"question": f"\u00c1rea c\u00edrculo r={r} (\u03c0=3,14)?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": "A=pi*r^2", "difficulty": "Medio",
            "topic": "areas"}

def _triangle_angle():
    a, b = random.randint(20, 70), random.randint(20, 70)
    if a + b >= 170:
        b = 50
    c = 180 - a - b
    wrong = [str(180 - a), str(a + b), str(c + 5)]
    opts, ai = shuffle_mcq(f"{c}", wrong)
    return {"question": f"Triangulo angulos {a} y {b} grados. Tercero?", "options": [f"{o} grados" for o in opts],
            "answer": ai, "answerKey": chr(65 + ai), "explanation": f"180-{a}-{b}={c}", "difficulty": "Facil",
            "topic": "angulos"}

def _system_simple():
    x, y = random.randint(1, 9), random.randint(1, 9)
    a1, b1 = random.randint(1, 4), random.randint(1, 4)
    c1 = a1 * x + b1 * y
    wrong = [str(x + d) for d in random.sample([-2, 2, 3], 3)]
    opts, ai = shuffle_mcq(str(x), wrong)
    return {"question": f"Sistema {a1}x+{b1}y={c1}, x-y={x - y}. Valor x?", "options": [f"x={o}" for o in opts],
            "answer": ai, "answerKey": chr(65 + ai), "explanation": f"x={x},y={y}", "difficulty": "Dificil",
            "topic": "sistemas"}

def _sqrt_simplify():
    n = random.choice([8, 12, 18, 20, 27, 32, 45, 48, 50, 72])
    for k in range(2, 15):
        if n % (k * k) == 0:
            rest = n // (k * k)
            correct = f"{k}*sqrt({rest})" if rest > 1 else str(k)
            break
    else:
        correct = f"sqrt({n})"
    wrong = [f"sqrt({n})", f"2*sqrt({n // 2 if n % 2 == 0 else n})", f"{int(math.sqrt(n))}*sqrt(2)"]
    opts, ai = shuffle_mcq(correct, wrong)
    return {"question": f"Simplifica sqrt({n})", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": correct, "difficulty": "Medio",
            "topic": "potencias"}

def _negative_ops():
    a, b = random.randint(2, 15), random.randint(2, 15)
    sym, ans = random.choice([("+", -a + b), ("-", -a - b), ("x", -a * b)])
    wrong = [str(ans + d) for d in random.sample([-5, 5, 3], 3)]
    opts, ai = shuffle_mcq(str(ans), wrong)
    return {"question": f"(-{a}) {sym} {b}?", "options": opts, "answer": ai,
            "answerKey": chr(65 + ai), "explanation": str(ans), "difficulty": "Facil",
            "topic": "enteros"}

def generate_m1(target=1000):
    gens = [
        ("Numeros", _pct_of_number), ("Numeros", _discount), ("Numeros", _power_rule),
        ("Numeros", _proportion), ("Numeros", _fraction_add), ("Numeros", _negative_ops),
        ("Numeros", _sqrt_simplify), ("Algebra y funciones", _linear_eq),
        ("Algebra y funciones", _function_eval), ("Algebra y funciones", _system_simple),
        ("Geometria", _pythagoras), ("Geometria", _rectangle_area), ("Geometria", _circle_area),
        ("Geometria", _triangle_angle), ("Probabilidad y estadistica", _mean),
        ("Probabilidad y estadistica", _median), ("Probabilidad y estadistica", _dice_probability),
    ]
    random.seed(42)
    return fill_pool("m1", gens, target)
