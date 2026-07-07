/** Renderiza figuras oficiales PAES (recortes del PDF DEMRE). */
export function questionFigureHtml(q) {
  const src = q?.figure || q?.figures?.[0];
  if (!src) return '';
  const alt = q?.num
    ? `Enunciado pregunta ${q.num}`
    : 'Enunciado de la pregunta';
  return `<figure class="question-figure"><img src="${src}" alt="${alt}" loading="lazy" /></figure>`;
}

/** Pregunta oficial con recorte PDF: el enunciado se lee desde la imagen, no del texto extraido. */
export function useOfficialFigure(q) {
  if (!q?.figure) return false;
  if (q.needsFigure) return true;
  const src = String(q.source || '');
  return src.includes('PAES') || Boolean(q.num && q.year);
}

export function questionBodyHtml(q) {
  if (useOfficialFigure(q)) return questionFigureHtml(q);
  return `<div class="question-text">${q.question}</div>`;
}

/** @deprecated usar useOfficialFigure */
export function prefersFigurePrimary(q) {
  return useOfficialFigure(q);
}
