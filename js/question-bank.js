import { fetchTestData } from './test-context.js';

const bankCache = new Map();
const poolCache = new Map();

const AREA_LABELS = {
  Numeros: 'Números',
  'Algebra y funciones': 'Álgebra y funciones',
  Geometria: 'Geometría',
  'Probabilidad y estadistica': 'Probabilidad y estadística',
  'Numeros avanzados': 'Números avanzados',
  Geografia: 'Geografía',
  'Educacion ciudadana': 'Educación ciudadana',
  Biologia: 'Biología',
  Fisica: 'Física',
  Quimica: 'Química',
  Localizar: 'Localizar',
  Interpretar: 'Interpretar',
  Evaluar: 'Evaluar',
  Integrar: 'Integrar',
};

export function labelArea(area) {
  return AREA_LABELS[area] || area;
}

export function normalizeQuestion(q) {
  const letter = q.answerKey || (typeof q.answer === 'number' ? String.fromCharCode(65 + q.answer) : '');
  return {
    ...q,
    area: labelArea(q.area || ''),
    explanation: q.explanation || (letter ? `La alternativa correcta es ${letter}.` : ''),
    difficulty: q.difficulty || 'Oficial',
  };
}

export async function loadPool(testId) {
  if (poolCache.has(testId)) return poolCache.get(testId);
  try {
    const res = await fetch(`data/${testId}/pool.json`);
    if (!res.ok) return [];
    const data = await res.json();
    const questions = data.questions || data;
    poolCache.set(testId, questions);
    return questions;
  } catch {
    return [];
  }
}

export async function loadBank(testId) {
  if (bankCache.has(testId)) return bankCache.get(testId);
  try {
    const res = await fetch(`data/${testId}/bank.json`);
    const pool = await loadPool(testId);
    if (!res.ok) {
      if (pool.length) {
        const fallback = { testId, questions: pool, scoredQuestions: 60 };
        bankCache.set(testId, fallback);
        return fallback;
      }
      return null;
    }
    const bank = await res.json();
    const official = bank.questions || [];
    bank.officialQuestions = official;
    bank.questions = [...official, ...pool];
    bank.poolCount = pool.length;
    bankCache.set(testId, bank);
    return bank;
  } catch {
    return null;
  }
}

export async function loadQuestions(testId) {
  const bank = await loadBank(testId);
  if (bank?.questions?.length) return bank.questions;
  const pool = await loadPool(testId);
  if (pool.length) return pool;
  return fetchTestData(testId, 'exercises');
}

export function pickOfficialSet(bank, totalNeeded) {
  const official = bank.officialQuestions || bank.questions?.filter(q => q.source !== 'generado') || [];
  const byNum = new Map();
  for (const q of official) {
    if (!q.num) continue;
    const existing = byNum.get(q.num);
    if (!existing || q.year === '2026') byNum.set(q.num, q);
  }
  const ordered = [...byNum.values()].sort((a, b) => a.num - b.num);
  if (ordered.length >= totalNeeded) return ordered.slice(0, totalNeeded);
  const usedIds = new Set(ordered.map(q => q.id));
  const extra = shuffle(official.filter(q => !usedIds.has(q.id)));
  return [...ordered, ...extra].slice(0, totalNeeded);
}

export function pickPracticeSet(bank, totalNeeded, area = null) {
  let pool = bank.questions || [];
  if (area) {
    const normalized = area.toLowerCase();
    const areaPool = pool.filter(q => {
      const a = labelArea(q.area).toLowerCase();
      return a.includes(normalized) || normalized.includes(a.split(' ')[0]);
    });
    if (areaPool.length >= totalNeeded) pool = areaPool;
  }
  return shuffle(pool).slice(0, totalNeeded);
}

export function pickDiagnosticSet(bank, totalNeeded) {
  const official = pickOfficialSet(bank, totalNeeded);
  if (official.length >= totalNeeded) return official;
  const used = new Set(official.map(q => q.id));
  const generated = shuffle((bank.questions || []).filter(q => q.source === 'generado' && !used.has(q.id)));
  return [...official, ...generated].slice(0, totalNeeded);
}

export function pickUnitSet(bank, area, count) {
  return pickPracticeSet(bank, count, area);
}

export function pickCheckpointSet(bank, totalNeeded) {
  return pickDiagnosticSet(bank, totalNeeded);
}

export async function buildQuestionSet(testId, { type, lessonArea = null, count }) {
  const bank = await loadBank(testId);
  if (!bank) {
    const legacy = await fetchTestData(testId, 'exercises');
    return shuffle(legacy).slice(0, count);
  }
  if (type === 'unit') return pickUnitSet(bank, lessonArea || '', count);
  if (type === 'diagnostic') return pickDiagnosticSet(bank, count);
  return pickCheckpointSet(bank, count);
}

export function scoreWithClavijero(bank, responses, preferredYear = '2026', { fullTest = true } = {}) {
  const year = bank.transformTables?.[preferredYear] ? preferredYear
    : Object.keys(bank.transformTables || {})[0] || '2026';
  const excluded = new Set(bank.clavijeros?.[year]?.excluded || []);
  let puntajeP = 0;
  let scoredTotal = 0;

  for (const r of responses) {
    const counts = r.countsForScore !== false && !excluded.has(r.num);
    if (!counts) continue;
    scoredTotal += 1;
    if (r.correct) puntajeP += 1;
  }

  const maxP = bank.scoredQuestions || 60;
  let lookupP = puntajeP;
  if (!fullTest && scoredTotal > 0 && scoredTotal < maxP) {
    lookupP = Math.round((puntajeP / scoredTotal) * maxP);
    lookupP = Math.min(lookupP, maxP);
  }

  const table = bank.transformTables?.[year] || {};
  const puntajePaes = table[String(lookupP)]
    ?? Math.round(100 + (lookupP / maxP) * 900);

  const correct = responses.filter(r => r.correct).length;
  return {
    correct,
    total: responses.length,
    puntajeP,
    puntajePaes,
    lookupP,
    scoredTotal,
    scoringYear: year,
    isPartial: !fullTest,
    excluded: [...excluded],
  };
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
