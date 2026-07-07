# -*- coding: utf-8 -*-
import random

from .common import fill_pool, shuffle_mcq

BIO = [
    ("Donde ocurre la fotosintesis?", "Cloroplastos", ["Mitocondrias", "Nucleo", "Ribosomas"], "La clorofila esta en cloroplastos."),
    ("Donde ocurre la respiracion celular aerobica?", "Mitocondrias", ["Cloroplastos", "Lisosomas", "Pared celular"], "Las mitocondrias producen ATP."),
    ("La unidad basica de la vida es", "La celula", ["El tejido", "El organo", "La molecula de ADN sola"], "Teoria celular."),
    ("El ADN se replica durante", "La fase S del ciclo celular", ["La mitosis solamente", "La meiosis II", "La citocinesis"], "Replicacion en interfase."),
    ("Un ecosistema incluye", "Componentes bioticos y abioticos", ["Solo animales", "Solo plantas", "Solo el suelo"], "Seres vivos y ambiente."),
    ("La seleccion natural actua sobre", "La variabilidad genetica", ["La voluntad individual", "Solo mutaciones artificiales", "La temperatura unicamente"], "Darwin: variacion + seleccion."),
]

FISICA = [
    ("La unidad de fuerza en el SI es", "Newton (N)", ["Joule", "Watt", "Pascal"], "F = m*a."),
    ("Velocidad es", "Cambio de posicion por tiempo", ["Fuerza por masa", "Energia por carga", "Presion por area"], "v = delta x / delta t."),
    ("La ley de Ohm establece", "V = I*R", ["P = I*V", "F = m*a", "E = mc^2"], "Voltaje = corriente * resistencia."),
    ("Un objeto en caida libre cerca de la Tierra acelera aprox.", "9,8 m/s^2", ["1 m/s^2", "98 m/s", "0 m/s^2"], "g aprox 9,8 m/s^2."),
    ("La energia cinetica es", "Ec = 1/2 m v^2", ["m*g*h", "I*V*t", "F*d"], "Depende de masa y velocidad."),
]

QUIMICA = [
    ("El numero atomico indica", "Protones en el nucleo", ["Neutrones solamente", "Electrones de valencia unicamente", "Masa total"], "Z = protones."),
    ("Un enlace ionico se forma entre", "Metal y no metal", ["Dos no metales", "Dos gases nobles", "Solo carbono y carbono"], "Transferencia de electrones."),
    ("El pH menor que 7 indica solucion", "Acida", ["Basica", "Neutra", "Salina siempre"], "Escala de acidez."),
    ("En una reaccion quimica balanceada se conserva", "La masa", ["El volumen siempre", "El color", "La temperatura"], "Ley de conservacion de la masa."),
    ("El agua (H2O) es una molecula", "Polar", ["Apolar siempre", "Ionica", "Metalica"], "Diferencia de electronegatividad."),
]


def _fact(area: str, bank: list):
    def gen():
        q, correct, wrong, expl = random.choice(bank)
        opts, ai = shuffle_mcq(correct, wrong)
        return {
            "area": area,
            "question": q,
            "options": opts,
            "answer": ai,
            "answerKey": chr(65 + ai),
            "explanation": expl,
            "difficulty": random.choice(["Facil", "Medio", "Medio"]),
        }
    return gen


def _stoichiometry():
    coef_a = random.randint(1, 3)
    coef_b = random.randint(1, 3)
    mass = coef_a * random.randint(2, 10)
    ans = mass * coef_b // coef_a
    wrong = [str(ans + d) for d in random.sample([2, -2, 5], 3)]
    opts, ai = shuffle_mcq(f"{ans} g", [f"{w} g" for w in wrong])
    return {
        "area": "Quimica",
        "question": f"Si {coef_a} mol de A ({mass} g) reaccionan con B en proporcion {coef_a}:{coef_b}, cuantos gramos de B se necesitan aprox.?",
        "options": opts,
        "answer": ai,
        "answerKey": chr(65 + ai),
        "explanation": f"Proporcion {coef_a}:{coef_b} -> {ans} g de B.",
        "difficulty": "Dificil",
    }


def _kinematics():
    v0, a, t = random.randint(0, 5), random.randint(1, 4), random.randint(2, 6)
    d = v0 * t + 0.5 * a * t * t
    ans = int(d)
    wrong = [str(ans + d) for d in random.sample([3, -3, 5], 3)]
    opts, ai = shuffle_mcq(f"{ans} m", [f"{w} m" for w in wrong])
    return {
        "area": "Fisica",
        "question": f"Movimiento rectilineo: v0={v0} m/s, a={a} m/s^2 durante t={t} s. Desplazamiento?",
        "options": opts,
        "answer": ai,
        "answerKey": chr(65 + ai),
        "explanation": f"d = v0*t + 1/2*a*t^2 = {ans} m.",
        "difficulty": "Medio",
    }


def _genetics():
    correct = "1/2" if random.random() < 0.5 else "1/4"
    wrong = [x for x in ["1/2", "1/4", "3/4", "1"] if x != correct][:3]
    opts, ai = shuffle_mcq(correct, wrong)
    return {
        "area": "Biologia",
        "question": "Cruce monohibrido Aa x Aa (rasgo dominante A). Probabilidad de heterocigoto?",
        "options": opts,
        "answer": ai,
        "answerKey": chr(65 + ai),
        "explanation": "Cuadro de Punnett: 2/4 heterocigoto -> 1/2.",
        "difficulty": "Medio",
    }


def generate_ciencias(target: int = 1000) -> list:
    gens = [
        ("Biologia", _fact("Biologia", BIO)),
        ("Fisica", _fact("Fisica", FISICA)),
        ("Quimica", _fact("Quimica", QUIMICA)),
        ("Quimica", _stoichiometry),
        ("Fisica", _kinematics),
        ("Biologia", _genetics),
    ]
    random.seed(46)
    return fill_pool("ciencias", gens, target)
