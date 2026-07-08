/** Renderiza figuras oficiales PAES (recortes del PDF DEMRE). */

export function questionFigureHtml(q) {
  const src = q?.figure || q?.figures?.[0];
  if (!src) return '';
  const alt = q?.num
    ? `Enunciado pregunta ${q.num}`
    : 'Enunciado de la pregunta';
  return `<figure class="question-figure"><img src="${src}" alt="${alt}" loading="lazy" /></figure>`;
}

/** Pregunta oficial con recorte PDF: el enunciado se lee desde la imagen. */
export function useOfficialFigure(q) {
  if (!q?.figure) return false;
  if (q.needsFigure) return true;
  const src = String(q.source || '');
  return src.includes('PAES') || Boolean(q.num && q.year);
}

export function hasOptionFigures(q) {
  return Array.isArray(q?.optionFigures) && q.optionFigures.length >= 4;
}

export function questionBodyHtml(q) {
  if (useOfficialFigure(q)) return questionFigureHtml(q);
  return `<div class="question-text">${q.question}</div>`;
}

/** Contenido de cada alternativa: imagen oficial o texto limpio. */
export function optionContentHtml(q, index, textOpt) {
  const letter = String.fromCharCode(65 + index);
  if (hasOptionFigures(q) && q.optionFigures[index]) {
    return `<img class="option-figure" src="${q.optionFigures[index]}" alt="Alternativa ${letter}" loading="lazy" />`;
  }
  return `${letter}. ${textOpt ?? ''}`;
}

export function optionButtonClass(q, index, selected) {
  const base = selected ? 'option selected' : 'option';
  return hasOptionFigures(q) ? `${base} option-with-figure` : base;
}

/** @deprecated */
export function prefersFigurePrimary(q) {
  return useOfficialFigure(q);
}
