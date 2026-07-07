const JUNK_PATTERNS = [
  /\bFORMA\s+\d+/i,
  /\bLECTURA\s+\d+/i,
  /Registro de Propiedad Intelectual/i,
  /^\d+\s*[-\u2013]\s*\d+\s*$/,
  /^[\d\s\-\+\*\/\=\.]+$/,
];

const INCOMPLETE_PATTERNS = [
  /en este orden:\s*\u00bf/i,
  /siguientes cartas, en este orden:\s*\u00bf/i,
  /la siguiente tabla:\s*\u00bf/i,
  /el siguiente gr[a\u00e1]fico:\s*\u00bf/i,
  /de la imagen:\s*\u00bf/i,
];

/** Pregunta que referencia figura/grafico/tabla sin recurso embebido en el texto. */
const VISUAL_DEPENDENCY_PATTERNS = [
  /recta num[e\u00e9]rica/i,
  /figura adjunta/i,
  /siguiente (gr[a\u00e1]fico|tabla|imagen|figura)/i,
  /en la (figura|imagen|cuadr[i\u00ed]cula)/i,
  /plano cartesiano de la figura/i,
  /observa la siguiente/i,
  /hoja de papel cuadriculado/i,
  /de la imagen/i,
  /vectores representados/i,
  /cuadr[i\u00ed]cula de la figura/i,
  /considera la siguiente tabla\s*:/i,
  /tri[a\u00e1]ngulo de pascal/i,
  /representaci[o\u00f3]n del tri[a\u00e1]ngulo/i,
];

/** Texto matematico corrupto por extraccion PDF (fracciones, operadores, etc.). */
const GARBLED_MATH_PATTERNS = [
  /\d{3,}\s+\d+\s*:\s*\d+/,
  /\d+\s*:\s*\d{3,}/,
  /\boperaci[o\u00f3]n\s+\d{2}\s+usando/i,
  /\bobteni[e\u00e9]ndo\s+se\b/i,
  /\best\s+ar[a\u00e1]n\b/i,
  /\bkmpara\b/i,
  /\bchi\s+rridos\b/i,
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/,
  /\b\d{5,}\b/,
];

const BROKEN_OPTION_PATTERNS = [
  /\s+\d+(?:\s+\d+){1,}\s*$/,
  /\s+-\s*\d+\s*-\s*$/,
];

const MONEY_PATTERN = /\$(\d{1,3}(?:\s\d{3})+(?:,\d+)?|\d{4,}(?:,\d+)?)/g;
const SPACED_THOUSANDS_PATTERN = /(?<=[\s=+\-*/(,])(\d{1,3}(?:\s\d{3})+)(?=[\s.,;:?)\]]|$)/g;

function formatChileanDigits(raw) {
  let digits = raw.replace(/\s/g, '');
  let decimal = null;
  if (digits.includes(',')) {
    [digits, decimal] = digits.split(',', 2);
  }
  digits = digits.replace(/\./g, '');
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal != null ? `${grouped},${decimal}` : grouped;
}

function formatChileanNumbers(text) {
  return text
    .replace(MONEY_PATTERN, (_, num) => `$${formatChileanDigits(num)}`)
    .replace(SPACED_THOUSANDS_PATTERN, (_, num) => formatChileanDigits(num));
}

function fixPdfArtifacts(text) {
  return text
    .replace(/\s+\d+(?:\s+\d+)+\s*[-\u2013]\s*\d+\s*[-\u2013](?:\s*[\s\S]*)?$/g, '')
    .replace(/\s*[-\u2013]\s*\d+\s*[-\u2013](?:\s*[\s\S]*)?$/g, '')
    .replace(/\s+\d+(?:\s+\d+)+\s*$/g, '')
    .replace(/\b(kg|g|mg|ml|cm|mm|L)(\d+(?:[.,]\d+)?)\b/gi, '$2 $1')
    .replace(/(\d+(?:[.,]\d+)?)\s*(g|kg|mg|ml|cm|mm)de\b/gi, '$1 $2 de')
    .replace(/(\$[\d\s.,]+)([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1])/gi, '$1 $2')
    .replace(/([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1)])(\$)/gi, '$1 $2')
    .replace(/\bkmpara\b/gi, 'km para')
    .replace(/\bobteni[e\u00e9]ndo\s+se\b/gi, 'obteni\u00e9ndose');
}

export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return formatChileanNumbers(fixPdfArtifacts(text))
    .replace(/\s*FORMA\s+\d+[\s\S]*$/gi, '')
    .replace(/\s*LECTURA\s+\d+[\s\S]*$/gi, '')
    .replace(/[\uF000-\uF0FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeQuestion(q) {
  const options = (q.options || []).map(sanitizeText).filter(Boolean);
  return {
    ...q,
    question: sanitizeText(q.question),
    options: options.length >= 4 ? options.slice(0, 4) : options,
    explanation: q.explanation ? sanitizeText(q.explanation) : q.explanation,
    figure: q.figure || null,
    needsFigure: q.needsFigure || needsVisualAsset(q),
  };
}

function mentionsParenthesesWithoutThem(text) {
  return /par[e\u00e9]ntesis/i.test(text) && !/[()]/.test(text);
}

function hasEmbeddedVisual(text) {
  return /<(img|svg|figure|canvas)\b/i.test(text) || /data:image\//i.test(text);
}

export function needsVisualAsset(q) {
  if (!q?.question) return false;
  const blob = `${sanitizeText(q.question)} ${(q.options || []).map(sanitizeText).join(' ')}`;
  return VISUAL_DEPENDENCY_PATTERNS.some(pat => pat.test(blob));
}

function hasGarbledMath(blob) {
  return GARBLED_MATH_PATTERNS.some(pat => pat.test(blob));
}

/** Pregunta legible: texto OK o figura oficial del PDF adjunta. */
export function isReadableQuestion(q) {
  if (!q?.question) return false;
  const question = sanitizeText(q.question);
  const options = (q.options || []).slice(0, 4).map(sanitizeText);
  const blob = `${question} ${options.join(' ')}`;
  const hasFigure = Boolean(q.figure || q.figures?.length);

  if (hasEmbeddedVisual(question)) return options.length === 4 && options.every(o => o && o.length >= 2);

  if (needsVisualAsset(q)) {
    if (!hasFigure) return false;
    for (const opt of options) {
      if (BROKEN_OPTION_PATTERNS.some(pat => pat.test(opt))) return false;
    }
    return options.length === 4 && options.every(o => o && o.length >= 2);
  }

  if (hasGarbledMath(blob)) return false;
  if (mentionsParenthesesWithoutThem(blob)) return false;

  for (const opt of options) {
    if (BROKEN_OPTION_PATTERNS.some(pat => pat.test(opt))) return false;
  }

  return question.length >= 20 && options.length === 4 && options.every(o => o && o.length >= 2);
}

export function isUsableQuestion(q) {
  if (!isReadableQuestion(q)) return false;
  if (!Array.isArray(q.options) || q.options.length < 4) return false;

  const question = sanitizeText(q.question);
  const options = q.options.map(sanitizeText);

  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;

  for (const pat of JUNK_PATTERNS) {
    if (pat.test(question)) return false;
  }
  for (const opt of options) {
    if (opt.length > 180) return false;
    for (const pat of JUNK_PATTERNS) {
      if (pat.test(opt)) return false;
    }
  }

  for (const pat of INCOMPLETE_PATTERNS) {
    if (pat.test(question)) return false;
  }

  const uniqueOpts = new Set(options.map(o => o.toLowerCase()));
  if (uniqueOpts.size < 3) return false;

  return true;
}

export function isPracticeQuestion(q) {
  if (!isReadableQuestion(q)) return false;
  if (!Array.isArray(q.options) || q.options.length < 4) return false;
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;
  return true;
}

export function filterPracticeQuestions(questions) {
  const seen = new Set();
  const out = [];
  for (const raw of questions) {
    const q = sanitizeQuestion(raw);
    if (!isPracticeQuestion(q)) continue;
    const key = q.id || `${q.question.slice(0, 80)}|${q.options.join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

export function filterUsableQuestions(questions) {
  const seen = new Set();
  const out = [];
  for (const raw of questions) {
    const q = sanitizeQuestion(raw);
    if (!isUsableQuestion(q)) continue;
    const key = `${q.question.slice(0, 80)}|${q.options.join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}
