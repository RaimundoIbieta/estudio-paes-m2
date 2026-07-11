import { fetchTestData } from './test-context.js';
import { CACHE_VERSION } from './config.js';

const { filterUsableQuestions, filterPracticeQuestions, sanitizeQuestion, isReadableQuestion } = await import(`./question-quality.js?v=${CACHE_VERSION}`);

const bankCache = new Map();
const poolCache = new Map();

const AREA_LABELS = {
  Numeros: 'N\u00fameros',
  'Algebra y funciones': '\u00c1lgebra y funciones',
  Geometria: 'Geometr\u00eda',
  'Probabilidad y estadistica': 'Probabilidad y estad\u00edstica',
  'Numeros avanzados': 'N\u00fameros avanzados',
  Geografia: 'Geograf\u00eda',
  'Educacion ciudadana': 'Educaci\u00f3n ciudadana',
  Biologia: 'Biolog\u00eda',
  Fisica: 'F\u00edsica',
  Quimica: 'Qu\u00edmica',
  Localizar: 'Localizar',
  Interpretar: 'Interpretar',
  Evaluar: 'Evaluar',
  Integrar: 'Integrar',
};

export function labelArea(area) {
  if (!area) return '';
  if (AREA_LABELS[area]) return AREA_LABELS[area];
  const key = Object.keys(AREA_LABELS).find(k => k.toLowerCase() === String(area).toLowerCase());
  return key ? AREA_LABELS[key] : area;
}

export function normalizeQuestion(q) {
  const clean = sanitizeQuestion(q);
  const letter = clean.answerKey || (typeof clean.answer === 'number' ? String.fromCharCode(65 + clean.answer) : '');
  return {
    ...clean,
    area: labelArea(q.area || clean.area || ''),
    explanation: clean.explanation || (letter ? `La alternativa correcta es ${letter}.` : ''),
    difficulty: clean.difficulty || 'Oficial',
  };
}

function usableBankQuestions(questions) {
  return filterUsableQuestions(questions).map(q => normalizeQuestion(q));
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
    const officialRaw = bank.questions || [];
    const official = usableBankQuestions(officialRaw);
    const poolStrict = usableBankQuestions(pool);
    const practice = filterPracticeQuestions([...officialRaw, ...pool]).map(normalizeQuestion);
    bank.officialQuestions = official;
    bank.questions = [...official, ...poolStrict];
    bank.practiceQuestions = practice;
    bank.practiceCount = practice.length;
    bank.poolCount = poolStrict.length;
    bank.rawTotal = officialRaw.length + pool.length;
    bankCache.set(testId, bank);
    return bank;
  } catch {
    return null;
  }
}

export async function loadQuestions(testId) {
  const bank = await loadBank(testId);
  if (bank?.practiceQuestions?.length) return bank.practiceQuestions;
  if (bank?.questions?.length) return bank.questions.map(normalizeQuestion);
  const pool = await loadPool(testId);
  if (pool.length) return filterPracticeQuestions(pool).map(normalizeQuestion);
  const legacy = await fetchTestData(testId, 'exercises');
  return legacy.map(normalizeQuestion);
}

export function pickOfficialSet(bank, totalNeeded) {
  const official = (bank.officialQuestions || bank.questions?.filter(q => q.source !== 'generado') || [])
    .filter(q => isReadableQuestion(q));
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

export function pickPracticeSet(bank, totalNeeded, area = null, practiceKeywords = null) {
  let pool = bank.practiceQuestions || bank.questions || [];
  if (Array.isArray(practiceKeywords) && practiceKeywords.length) {
    const keyed = pool.filter(q => {
      const blob = `${q.topic || ''} ${q.question || ''} ${(q.options || []).join(' ')}`.toLowerCase();
      return practiceKeywords.some(k => blob.includes(String(k).toLowerCase()));
    });
    if (keyed.length >= Math.min(totalNeeded, 8)) pool = keyed;
  } else if (area) {
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
  const practice = bank.practiceQuestions || [];
  if (practice.length >= totalNeeded) {
    const set = pickBalancedRandomSet(practice, totalNeeded);
    if (set.length >= totalNeeded) return set;
  }
  return pickDiagnosticSetFixed(bank, totalNeeded);
}

/** Ensayo variado: mezcla oficial + pool generado, balanceado por area. */
function pickBalancedRandomSet(candidates, totalNeeded) {
  const pool = shuffle(candidates.filter(isReadableQuestion));
  if (!pool.length) return [];

  const byArea = new Map();
  for (const q of pool) {
    const key = String(labelArea(q.area) || 'Otros').toLowerCase();
    if (!byArea.has(key)) byArea.set(key, []);
    byArea.get(key).push(q);
  }

  const picked = [];
  const usedIds = new Set();

  const officialWithFigures = shuffle(
    pool.filter(q => q.source !== 'generado' && q.optionFigures?.length >= 4),
  );
  const officialCap = Math.min(
    Math.floor(totalNeeded * 0.25),
    officialWithFigures.length,
    18,
  );
  for (let i = 0; i < officialCap; i++) {
    const q = officialWithFigures[i];
    if (!q || usedIds.has(q.id)) continue;
    usedIds.add(q.id);
    picked.push(q);
  }

  const remaining = totalNeeded - picked.length;
  const areas = [...byArea.keys()];
  const perArea = Math.floor(remaining / Math.max(areas.length, 1));
  let extra = remaining - perArea * areas.length;

  for (const area of shuffle(areas)) {
    let quota = perArea + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    for (const q of shuffle(byArea.get(area) || [])) {
      if (quota <= 0 || picked.length >= totalNeeded) break;
      if (usedIds.has(q.id)) continue;
      usedIds.add(q.id);
      picked.push(q);
      quota -= 1;
    }
  }

  for (const q of pool) {
    if (picked.length >= totalNeeded) break;
    if (usedIds.has(q.id)) continue;
    usedIds.add(q.id);
    picked.push(q);
  }

  return shuffle(picked).slice(0, totalNeeded).map((q, i) => ({
    ...q,
    paesNum: q.source !== 'generado' && q.num ? q.num : null,
    num: i + 1,
    countsForScore: true,
  }));
}

/** Respaldo si el pool no carga: ensayo fijo por numero PAES 1..N. */
function pickDiagnosticSetFixed(bank, totalNeeded) {
  const official = (bank.questions || []).filter(q =>
    q.source !== 'generado' && q.num && isReadableQuestion(q)
  );
  const withOpts = official.filter(q => Array.isArray(q.optionFigures) && q.optionFigures.length >= 4);
  const withoutOpts = official.filter(q => !(Array.isArray(q.optionFigures) && q.optionFigures.length >= 4));
  const ranked = [...withOpts, ...withoutOpts];

  const byNum = new Map();
  for (const q of ranked) {
    const existing = byNum.get(q.num);
    if (!existing || q.year === '2026') byNum.set(q.num, q);
  }

  const fillers = shuffle((bank.practiceQuestions || []).filter(q =>
    q.source === 'generado' && isReadableQuestion(q)
  ));
  const usedIds = new Set();
  const slots = [];

  for (let n = 1; n <= totalNeeded; n++) {
    if (byNum.has(n)) {
      const q = byNum.get(n);
      slots.push(q);
      usedIds.add(q.id);
      continue;
    }
    while (fillers.length) {
      const f = fillers.pop();
      if (usedIds.has(f.id)) continue;
      slots.push({ ...f, num: n, countsForScore: false, supplement: true });
      usedIds.add(f.id);
      break;
    }
  }

  while (slots.length < totalNeeded && fillers.length) {
    const f = fillers.pop();
    if (usedIds.has(f.id)) continue;
    slots.push({ ...f, countsForScore: false, supplement: true });
    usedIds.add(f.id);
  }

  return slots.slice(0, totalNeeded);
}

export function pickUnitSet(bank, area, count, practiceKeywords = null) {
  return pickPracticeSet(bank, count, area, practiceKeywords);
}

export function pickCheckpointSet(bank, totalNeeded) {
  return pickDiagnosticSet(bank, totalNeeded);
}

export async function buildQuestionSet(testId, { type, lessonArea = null, count, practiceKeywords = null }) {
  const bank = await loadBank(testId);
  if (!bank) {
    const legacy = await fetchTestData(testId, 'exercises');
    return shuffle(legacy).slice(0, count);
  }
  if (type === 'unit') return pickUnitSet(bank, lessonArea || '', count, practiceKeywords);
  if (type === 'diagnostic') return pickDiagnosticSet(bank, count);
  return pickCheckpointSet(bank, count);
}

export function scoreWithClavijero(bank, responses, preferredYear = '2026', { fullTest = true, ignoreExcluded = false } = {}) {
  const year = bank.transformTables?.[preferredYear] ? preferredYear
    : Object.keys(bank.transformTables || {})[0] || '2026';
  const excluded = ignoreExcluded
    ? new Set()
    : new Set(bank.clavijeros?.[year]?.excluded || []);
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
