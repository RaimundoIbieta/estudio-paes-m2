# -*- coding: utf-8 -*-
import random

from .common import fill_pool, shuffle_mcq

HISTORIA = [
    ("En que ano se firmo el Tratado de Tapihue?", "1821", ["1810", "1818", "1830"], "1821", "chile-xix"),
    ("Quien fue el director supremo tras la batalla de Chacabuco?", "Bernardo O'Higgins", ["Jose Miguel Carrera", "Manuel Rodriguez", "Diego Portales"], "O'Higgins lidero tras Chacabuco (1817).", "chile-xix"),
    ("Que constitucion consolido la republica conservadora en 1833?", "Constitucion de 1833", ["Constitucion de 1828", "Constitucion de 1925", "Constitucion de 1980"], "La de 1833 establecio presidencia fuerte.", "chile-xix"),
    ("La Guerra del Pacifico enfrento a Chile con", "Peru y Bolivia", ["Argentina y Uruguay", "Espana", "Brasil"], "1879-1884 contra Peru y Bolivia.", "chile-xix"),
    ("Que recurso impulso la economia nortena tras 1880?", "Salitre", ["Cobre", "Petroleo", "Trigo"], "El salitre fue clave en el norte.", "economia"),
    ("El periodo 1891-1925 se conoce como", "Parlamentarismo", ["Presidencialismo", "Dictadura", "Colonia"], "El Congreso gano protagonismo.", "chile-xix"),
    ("Que movimiento social surgio con fuerza en los anos 60?", "Reformas estructurales", ["Restauracion colonial", "Aislamiento total", "Migracion masiva a Europa"], "Decada de reformas y movilizacion.", "chile-xx"),
    ("La Unidad Popular goberno entre", "1970 y 1973", ["1964 y 1970", "1973 y 1988", "1990 y 2000"], "Gobierno de Salvador Allende.", "chile-xx"),
]

GEOGRAFIA = [
    ("Que cordillera limita Chile al este?", "Los Andes", ["La Costa", "El Pacifico", "La Antartica"], "Los Andes separan Chile de Argentina.", "geografia"),
    ("El clima desertico se encuentra principalmente en", "Norte Grande", ["Sur Austral", "Zona Central", "Chiloe"], "Atacama y norte.", "geografia"),
    ("Que corriente enfria la costa de Chile?", "Humboldt", ["El Nino", "Golfo", "Jet Stream"], "Corriente de Humboldt.", "geografia"),
    ("La densidad poblacional es mayor en", "Zona central", ["Patagonia", "Desierto de Atacama", "Altiplano"], "Santiago y valle central.", "geografia"),
    ("Que factor explica la concentracion urbana?", "Oportunidades economicas y servicios", ["Solo el clima frio", "Falta de transporte", "Aislamiento voluntario"], "Centralizacion historica.", "geografia"),
]

CIUDADANIA = [
    ("La separacion de poderes divide el Estado en", "Ejecutivo, Legislativo y Judicial", ["Solo Ejecutivo", "Municipal y privado", "Ejercito y policia"], "Tres poderes clasicos.", "ciudadania"),
    ("Un derecho fundamental es", "Libertad de expresion", ["Obligacion de votar siempre", "Exencion de impuestos", "Mandato vitalicio"], "Garantias constitucionales.", "ciudadania"),
    ("La participacion ciudadana incluye", "Votar y formarse opinion informada", ["Solo protestar", "Evitar la politica", "Delegar todo"], "Democracia requiere participacion.", "ciudadania"),
    ("Un principio del Estado de derecho es", "Nadie esta sobre la ley", ["Impunidad selectiva", "Leyes secretas", "Poder sin control"], "Igualdad ante la ley.", "ciudadania"),
]


def _fact_bank(area: str, bank: list):
    def gen():
        row = random.choice(bank)
        q, correct, wrong, expl = row[0], row[1], row[2], row[3]
        topic = row[4] if len(row) > 4 else area.lower()
        opts, ai = shuffle_mcq(correct, wrong)
        return {
            "area": area,
            "topic": topic,
            "question": q,
            "options": opts,
            "answer": ai,
            "answerKey": chr(65 + ai),
            "explanation": expl if len(expl) > 20 else f"La respuesta correcta es {correct}. {expl}",
            "difficulty": random.choice(["Facil", "Medio", "Medio"]),
        }
    return gen


def _timeline():
    year = random.choice([1810, 1818, 1833, 1879, 1891, 1925, 1970, 1988, 1990])
    events = {
        1810: "Inicio proceso independentista",
        1818: "Proclamacion de independencia",
        1833: "Constitucion conservadora",
        1879: "Inicio Guerra del Pacifico",
        1891: "Revolucion y parlamentarismo",
        1925: "Nueva constitucion",
        1970: "Eleccion de Allende",
        1988: "Plebiscito",
        1990: "Retorno a la democracia",
    }
    topic = "chile-xix" if year < 1900 else "chile-xx"
    correct = events[year]
    wrong = [events[y] for y in random.sample([k for k in events if k != year], 3)]
    opts, ai = shuffle_mcq(correct, wrong)
    return {
        "area": "Historia",
        "topic": topic,
        "question": f"Que acontecimiento corresponde al ano {year}?",
        "options": opts,
        "answer": ai,
        "answerKey": chr(65 + ai),
        "explanation": f"En {year}: {correct}.",
        "difficulty": "Medio",
    }


def _map_skill():
    skill = random.choice(["localizar", "analizar", "evaluar", "aplicar"])
    prompts = {
        "localizar": ("En un mapa de Chile, donde se ubica principalmente el clima mediterraneo?", "Zona central", ["Norte desertico", "Patagonia", "Altiplano"], "geografia"),
        "analizar": ("Que explica la migracion campo-ciudad en el siglo XX?", "Industrializacion y empleo urbano", ["Solo el clima", "Prohibicion legal", "Falta de ciudades"], "economia"),
        "evaluar": ("Un grafico muestra aumento de desigualdad. Que conclusion es valida?", "La brecha crecio en el periodo", ["Desaparecio la pobreza", "No hay datos", "Todos ganaron igual"], "fuentes"),
        "aplicar": ("Si un municipio quiere reducir basura, que medida es coherente?", "Reciclaje y educacion ambiental", ["Quemar residuos", "Ignorar el problema", "Prohibir vivienda"], "ciudadania"),
    }
    q, correct, wrong, topic = prompts[skill]
    opts, ai = shuffle_mcq(correct, wrong)
    area = {"geografia": "Geografia", "economia": "Historia", "fuentes": "Historia", "ciudadania": "Educacion ciudadana"}[topic]
    return {
        "area": area,
        "topic": topic,
        "question": q,
        "options": opts,
        "answer": ai,
        "answerKey": chr(65 + ai),
        "explanation": correct,
        "difficulty": "Medio",
    }


def generate_hcs(target: int = 1000) -> list:
    gens = [
        ("Historia", _fact_bank("Historia", HISTORIA)),
        ("Geografia", _fact_bank("Geografia", GEOGRAFIA)),
        ("Educacion ciudadana", _fact_bank("Educacion ciudadana", CIUDADANIA)),
        ("Historia", _timeline),
        ("Geografia", _map_skill),
        ("Educacion ciudadana", _map_skill),
    ]
    random.seed(45)
    return fill_pool("hcs", gens, target)
