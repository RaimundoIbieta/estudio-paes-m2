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

/** Formato chileno: miles con punto y decimales con coma ($13.700, 0,5). */
function formatChileanNumbers(text) {
  return text
    .replace(MONEY_PATTERN, (_, num) => `$${formatChileanDigits(num)}`)
    .replace(SPACED_THOUSANDS_PATTERN, (_, num) => formatChileanDigits(num));
}

/** Artefactos de extraccion PDF DEMRE (espacios faltantes, pies de pagina). */
function fixPdfArtifacts(text) {
  return text
    // Pie de pagina con digitos espaciados: " 1 0 1 - 4 -"
    .replace(/\s+\d+(?:\s+\d+)+\s*[-\u2013]\s*\d+\s*[-\u2013](?:\s*[\s\S]*)?$/g, '')
    .replace(/\s*[-\u2013]\s*\d+\s*[-\u2013](?:\s*[\s\S]*)?$/g, '')
    // Unidad antes del numero: kg60 -> 60 kg
    .replace(/\b(kg|g|mg|ml|cm|mm|L)(\d+(?:[.,]\d+)?)\b/gi, '$2 $1')
    .replace(/(\d+(?:[.,]\d+)?)\s*(g|kg|mg|ml|cm|mm)de\b/gi, '$1 $2 de')
    .replace(/(\$[\d\s.,]+)([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1])/gi, '$1 $2')
    .replace(/([a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1)])(\$)/gi, '$1 $2');
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
  };
}

export function isUsableQuestion(q) {
  if (!q?.question || !Array.isArray(q.options) || q.options.length < 4) return false;

  const question = sanitizeText(q.question);
  const options = q.options.map(sanitizeText);

  if (question.length < 25) return false;
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;

  for (const pat of JUNK_PATTERNS) {
    if (pat.test(question)) return false;
  }
  for (const opt of options) {
    if (!opt || opt.length < 1 || opt.length > 180) return false;
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
  if (!q?.question || !Array.isArray(q.options) || q.options.length < 4) return false;
  const question = sanitizeText(q.question);
  const options = q.options.slice(0, 4).map(sanitizeText);
  if (question.length < 15) return false;
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;
  if (options.some(opt => !opt)) return false;
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
