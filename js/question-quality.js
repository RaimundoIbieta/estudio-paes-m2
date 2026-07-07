const JUNK_PATTERNS = [
  /\bFORMA\s+\d+/i,
  /\bLECTURA\s+\d+/i,
  /Registro de Propiedad Intelectual/i,
  /^\d+\s*[-–]\s*\d+\s*$/,
  /^[\d\s\-\+\*\/\=\.]+$/,
];

const INCOMPLETE_PATTERNS = [
  /en este orden:\s*¿/i,
  /siguientes cartas, en este orden:\s*¿/i,
  /la siguiente tabla:\s*¿/i,
  /el siguiente gr[aá]fico:\s*¿/i,
  /de la imagen:\s*¿/i,
];

export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
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
