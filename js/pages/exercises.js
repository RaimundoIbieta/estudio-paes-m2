import { getCurrentTest } from '../test-context.js';
import { CACHE_VERSION } from '../config.js';

const PAGE_SIZE = 12;

async function practiceQuiz() {
  const { runPracticeQuiz } = await import(`../practice-quiz.js?v=${CACHE_VERSION}`);
  return runPracticeQuiz;
}

export async function loadExercises() {
  const testId = getCurrentTest();
  const { loadQuestions } = await import(`../question-bank.js?v=${CACHE_VERSION}`);
  return loadQuestions(testId);
}

function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function previewText(q, max = 140) {
  const text = stripHtml(q.question);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function matchArea(questionArea, lessonArea) {
  const a = (questionArea || '').toLowerCase();
  const b = (lessonArea || '').toLowerCase();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a.split(' ')[0]) || a.split(' ')[0] === b.split(' ')[0];
}

/** Filtra por keywords/topic de la unidad (evita mezclar % con obreros, etc.). */
function matchLessonTopic(q, lesson) {
  const keys = lesson.practiceKeywords;
  if (!Array.isArray(keys) || !keys.length) return matchArea(q.area, lesson.area);
  const blob = `${q.topic || ''} ${q.question || ''} ${(q.options || []).join(' ')}`.toLowerCase();
  return keys.some(k => blob.includes(String(k).toLowerCase()));
}

export async function startUnitPractice(container, lessonId) {
  const testId = getCurrentTest();
  const { loadContent } = await import('./content.js');
  const topics = await loadContent();
  const lesson = topics.find(t => t.id === lessonId);
  if (!lesson) {
    location.hash = '#/contenido';
    return;
  }

  const all = await loadExercises();
  let pool = all.filter(q => matchLessonTopic(q, lesson));
  if (pool.length < 5) {
    // Respaldo: misma area, pero sin keywords de otras unidades del area
    const siblings = topics.filter(t => t.id !== lesson.id && matchArea(t.area, lesson.area));
    const foreign = siblings.flatMap(t => t.practiceKeywords || []);
    pool = all.filter(q => {
      if (!matchArea(q.area, lesson.area)) return false;
      const blob = `${q.topic || ''} ${q.question || ''}`.toLowerCase();
      return !foreign.some(k => blob.includes(String(k).toLowerCase()));
    });
  }
  if (pool.length < 5) pool = all.filter(q => matchArea(q.area, lesson.area));
  if (pool.length < 5) pool = all;
  const questions = [...pool].sort(() => Math.random() - 0.5).slice(0, 8);

  const runPracticeQuiz = await practiceQuiz();
  runPracticeQuiz(container, questions, {
    returnHash: `#/contenido/${lessonId}`,
    title: lesson.title,
    recordStats: true,
  });
}

export async function renderExercises(container, filterArea = 'all', page = 0) {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }
  const exercises = await loadExercises();
  const { loadBank } = await import(`../question-bank.js?v=${CACHE_VERSION}`);
  const bank = await loadBank(testId);
  const areas = [...new Set(exercises.map(e => e.area))].sort();
  const filtered = filterArea === 'all' ? exercises : exercises.filter(e => e.area === filterArea);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const rawTotal = bank?.rawTotal || exercises.length;
  const essayCount = bank?.practiceCount || bank?.questions?.length || 0;

  container.innerHTML = `
    <h1 class="page-title">Ejercicios</h1>
    <p class="page-sub">Banco de <strong>${exercises.length.toLocaleString('es-CL')}</strong> preguntas para pr\u00e1ctica
      (${rawTotal.toLocaleString('es-CL')} en total, ${essayCount.toLocaleString('es-CL')} aptas para ensayo).
      Aqu\u00ed practicas con <strong>feedback inmediato</strong> (no es un ensayo cronometrado).</p>

    <div class="results-grid" style="margin-bottom:1rem">
      <div class="stat-box"><strong>${exercises.length}</strong><span>Total disponibles</span></div>
      <div class="stat-box"><strong>${areas.length}</strong><span>\u00c1reas</span></div>
      <div class="stat-box"><strong>${filtered.length}</strong><span>En filtro actual</span></div>
    </div>

    <div class="filters" id="ex-filters">
      <button class="filter-btn ${filterArea === 'all' ? 'active' : ''}" data-area="all">Todos</button>
      ${areas.map(a => `<button class="filter-btn ${filterArea === a ? 'active' : ''}" data-area="${a}">${a}</button>`).join('')}
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">
      <button class="btn btn-primary" id="random-5">Aleatorio (5)</button>
      <button class="btn btn-primary" id="random-10">Aleatorio (10)</button>
      <button class="btn btn-secondary" id="random-20">Sesi\u00f3n larga (20)</button>
    </div>

    <div class="grid" id="ex-grid">
      ${renderExerciseCards(slice)}
    </div>

    ${totalPages > 1 ? `
    <div class="quiz-actions" style="margin-top:1rem;justify-content:center">
      <button class="btn btn-secondary" id="ex-prev" ${safePage === 0 ? 'disabled' : ''}>Anterior</button>
      <span class="topic-meta" style="align-self:center">P\u00e1gina ${safePage + 1} de ${totalPages}</span>
      <button class="btn btn-secondary" id="ex-next" ${safePage >= totalPages - 1 ? 'disabled' : ''}>Siguiente</button>
    </div>` : ''}
  `;

  container.querySelector('#ex-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-area]');
    if (!btn) return;
    renderExercises(container, btn.dataset.area, 0);
  });

  container.querySelector('#ex-grid').addEventListener('click', e => {
    const card = e.target.closest('[data-ex-id]');
    if (card) startQuiz(container, [card.dataset.exId]);
  });

  const startRandom = async (n) => {
    const pool = filterArea === 'all' ? exercises : filtered;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    startQuiz(container, shuffled.map(q => q.id), { isSession: true });
  };

  container.querySelector('#random-5').addEventListener('click', () => startRandom(5));
  container.querySelector('#random-10').addEventListener('click', () => startRandom(10));
  container.querySelector('#random-20').addEventListener('click', () => startRandom(20));
  container.querySelector('#ex-prev')?.addEventListener('click', () => renderExercises(container, filterArea, safePage - 1));
  container.querySelector('#ex-next')?.addEventListener('click', () => renderExercises(container, filterArea, safePage + 1));
}

function renderExerciseCards(exercises) {
  return exercises.map(ex => `
    <article class="card" style="cursor:pointer" data-ex-id="${ex.id}">
      <span class="badge">${ex.area} · ${ex.difficulty}</span>
      <p style="margin:0.6rem 0 0">${previewText(ex)}</p>
      <button class="btn btn-secondary btn-block" style="margin-top:0.75rem">Responder</button>
    </article>
  `).join('');
}

export async function startQuiz(container, ids, opts = {}) {
  const options = typeof opts === 'boolean' ? { isSession: opts } : opts;
  const all = await loadExercises();
  const questions = ids.map(id => all.find(q => q.id === id)).filter(Boolean);
  if (!questions.length) return;

  const runPracticeQuiz = await practiceQuiz();
  runPracticeQuiz(container, questions, {
    returnHash: options.returnHash || '#/ejercicios',
    title: 'Ejercicios',
    recordStats: !options.isSession,
  });
}

export async function runQuizSession(container, questions, opts = {}) {
  const runPracticeQuiz = await practiceQuiz();
  return runPracticeQuiz(container, questions, opts);
}
