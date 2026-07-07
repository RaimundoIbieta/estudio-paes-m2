/** Renderiza figuras oficiales PAES (recortes del PDF DEMRE). */
export function questionFigureHtml(q) {
  const src = q?.figure || q?.figures?.[0];
  if (!src) return '';
  const alt = q?.num
    ? `Material visual pregunta ${q.num}`
    : 'Material visual de la pregunta';
  return `<figure class="question-figure"><img src="${src}" alt="${alt}" loading="lazy" /></figure>`;
}

export function prefersFigurePrimary(q) {
  return Boolean(q?.figure && q?.needsFigure);
}
