# -*- coding: utf-8 -*-
import random
from .common import fill_pool, shuffle_mcq

PASSAGE_TEMPLATES = [
    {"area": "Localizar", "topic": "localizar", "template": (
        "El informe de {org} ({year}) senala que en la region de {region} "
        "la temperatura media anual alcanzo {temp} C, un aumento de {delta} C "
        "respecto a la decada anterior. La precipitacion disminuyo un {pct}%."),
     "questions": [
        ("Cual fue la temperatura media anual reportada?",
         lambda d: (f"{d['temp']} C", [f"{d['temp']+2} C", f"{d['temp']-3} C", f"{d['delta']} C"]),
         lambda d: f"Dato explicito en el texto: {d['temp']} C."),
        ("En cuantos grados aumento la temperatura?",
         lambda d: (f"{d['delta']} C", [f"{d['pct']}%", f"{d['temp']} C", f"{d['year']} C"]),
         lambda d: f"El texto indica un aumento de {d['delta']} C."),
     ]},
    {"area": "Interpretar", "topic": "interpretar", "template": (
        "En su ensayo '{titulo}', la autora {autora} sostiene que {tema} es resultado "
        "de decisiones colectivas. Relata la experiencia de una familia de {ciudad} "
        "cuando {evento}."),
     "questions": [
        ("Cual es la idea central?",
         lambda d: (f"{d['tema']} es producto de decisiones colectivas",
                    [f"{d['tema']} afecta solo a una familia", "La autora rechaza adaptacion", f"{d['evento']} es inevitable"]),
         lambda d: "La autora vincula el fenomeno con decisiones colectivas."),
     ]},
    {"area": "Evaluar", "topic": "evaluar", "template": (
        "Un columnista afirma que {medida} reducira {problema}. Estudios de la U. {uni} "
        "muestran resultados mixtos segun contexto."),
     "questions": [
        ("Que critica al columnista?",
         lambda d: ("Simplifica una relacion dependiente del contexto",
                    ["Carece de evidencia", "Esta totalmente respaldada", "No menciona el problema"]),
         lambda d: "Los estudios mixtos indican que la relacion depende del contexto."),
     ]},
    {"area": "Integrar", "topic": "integrar", "template": (
        "El poema de {poeta} y el articulo de {periodista} abordan {tema}. "
        "El poema enfatiza emocion; el articulo cifras en {pais}."),
     "questions": [
        ("Que aporta integrar ambos textos?",
         lambda d: ("Comprender desde lo humano y lo social",
                    ["Eliminar subjetividad", "Demostrar que el articulo es falso", "Reemplazar poesia"]),
         lambda d: "Ambos textos aportan dimensiones complementarias del mismo tema."),
     ]},
]

ORGS = ["Cepal", "MMA", "INE", "OMS"]
REGIONS = ["Valparaiso", "Araucania", "Antofagasta", "Maule", "Los Lagos"]
CITIES = ["Concepcion", "Iquique", "Temuco", "Rancagua", "Puerto Montt"]
AUTORAS = ["Maria Soto", "Camila Rojas", "Andrea Munoz", "Paula Herrera"]
TEMAS = ["la sequia", "la migracion", "la contaminacion", "el envejecimiento"]
EVENTOS = ["cambio horario escolar", "restriccion de agua", "mas transporte publico"]
TITULOS = ["Horizontes", "Raices", "Ecos del sur", "Cartografias"]
MEDIDAS = ["multas altas", "horarios escalonados", "subsidios"]
PROBLEMAS = ["congestion", "basura urbana", "informalidad"]
UNIS = ["Chile", "Concepcion", "Catolica", "Santiago"]
POETAS = ["Neruda", "Zurita", "Ferreira", "Huidobro"]
PERIODISTAS = ["J. Perez", "L. Gonzalez", "R. Sanchez"]
PAISES = ["Chile", "Peru", "Argentina", "Bolivia"]

def _cl_passage_question():
    tpl = random.choice(PASSAGE_TEMPLATES)
    data = {"org": random.choice(ORGS), "region": random.choice(REGIONS),
            "year": random.randint(2018, 2025), "temp": random.randint(12, 22),
            "delta": round(random.uniform(0.5, 2.5), 1), "pct": random.randint(8, 25),
            "titulo": random.choice(TITULOS), "autora": random.choice(AUTORAS),
            "tema": random.choice(TEMAS), "ciudad": random.choice(CITIES),
            "evento": random.choice(EVENTOS), "medida": random.choice(MEDIDAS),
            "problema": random.choice(PROBLEMAS), "uni": random.choice(UNIS),
            "poeta": random.choice(POETAS), "periodista": random.choice(PERIODISTAS),
            "pais": random.choice(PAISES)}
    passage = tpl["template"].format(**data)
    q_tpl, ans_fn, expl_fn = random.choice(tpl["questions"])
    correct, wrong = ans_fn(data)
    opts, ai = shuffle_mcq(correct, wrong)
    return {"area": tpl["area"], "topic": tpl["topic"],
            "question": f"<p class='passage'>{passage}</p><p><strong>{q_tpl}</strong></p>",
            "options": opts, "answer": ai, "answerKey": chr(65 + ai),
            "explanation": expl_fn(data), "difficulty": "Medio"}

def _vocab_context():
    words = [("abundante", "en gran cantidad", "escaso", "rapido", "antiguo"),
             ("meticuloso", "cuidadoso", "ruidoso", "temporal", "distante"),
             ("efimero", "de corta duracion", "permanente", "fuerte", "claro")]
    w, correct, *wrong = random.choice(words)
    opts, ai = shuffle_mcq(correct, list(wrong))
    return {"area": "Interpretar", "topic": "vocabulario",
            "question": f"Palabra '{w}' en contexto significa:",
            "options": opts, "answer": ai, "answerKey": chr(65 + ai),
            "explanation": f"'{w}' = {correct}", "difficulty": "Medio"}

def generate_cl(target=1000):
    gens = [("Localizar", _cl_passage_question), ("Interpretar", _cl_passage_question),
            ("Evaluar", _cl_passage_question), ("Integrar", _cl_passage_question),
            ("Interpretar", _vocab_context)]
    random.seed(44)
    return fill_pool("cl", gens, target)
