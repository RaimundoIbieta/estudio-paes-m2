import { getCurrentTest, loadTests } from '../test-context.js';
import { getGate } from '../learning-path.js';
import { getOfficialExams } from './biblioteca.js';
import { loadBank } from '../question-bank.js';
import { CACHE_VERSION } from '../config.js';

export async function loadExercises() {
  const { loadQuestions } = await import('../question-bank.js');
  return loadQuestions(getCurrentTest());
}

export async function loadEssays() {
  const { fetchTestData } = await import('../test-context.js');
  return fetchTestData(null, 'essays');
}

export async function renderEssays(container) {
  const testId = getCurrentTest();
  if (!testId) {
    container.innerHTML = `
      <h1 class="page-title">Ensayos PAES</h1>
      <div class="card">
        <p>Primero elige la prueba que quieres preparar.</p>
        <a href="#/pruebas" class="btn btn-primary" data-route>Elegir prueba</a>
      </div>`;
    return;
  }
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const essays = await loadEssays();
  const gate = getGate(testId);
  const official = await getOfficialExams(testId);
  const bank = await loadBank(testId);
  const totalQ = bank ? bank.questions.length : 0;
  const poolQ = bank?.poolCount || 0;
  const bankInfo = bank
    ? `${totalQ.toLocaleString('es-CL')} preguntas (${poolQ.toLocaleString('es-CL')} generadas + oficiales) · puntaje segun clavijero`
    : 'Banco en construccion';

  const pruebas = official.filter(o => o.kind === 'prueba');
  const clavijeros = official.filter(o => o.kind === 'clavijero');

  container.innerHTML = `
    <h1 class="page-title">Ensayos — ${test?.short || ''}</h1>
    <p class="page-sub">Ensayos interactivos de la plataforma + pruebas PAES oficiales DEMRE en PDF. ${bankInfo}.</p>

    <section class="card" style="margin-bottom:1rem">
      <h3>Ruta de estudio (interactivo)</h3>
      <div class="topic-list">
        <a class="topic-item" href="#/ensayo/diagnostico" data-route>
          <div><strong>Ensayo diagnóstico inicial</strong><div class="topic-meta">Obligatorio · ${test?.questions || 65} preguntas · ${test?.durationMinutes || 140} min</div></div>
          <span class="badge">${gate.type === 'diagnostic' ? 'Pendiente' : '✓'}</span>
        </a>
        <a class="topic-item" href="#/ensayo/progreso" data-route>
          <div><strong>Ensayo de progreso</strong><div class="topic-meta">Cada 2 unidades · ${test?.questions || 65} preguntas</div></div>
          <span class="badge">Ruta</span>
        </a>
      </div>
    </section>

    ${pruebas.length ? `
    <section class="card" style="margin-bottom:1rem">
      <h3>Pruebas PAES oficiales (PDF)</h3>
      <p class="page-sub">Rinde la prueba en papel y revisa con el clavijero.</p>
      <div class="topic-list">
        ${pruebas.map(p => `
          <a class="topic-item" href="${p.path}" target="_blank" rel="noopener">
            <div><strong>PAES ${test?.short} — ${p.year}</strong><div class="topic-meta">${p.title}</div></div>
            <span class="badge">Abrir PDF</span>
          </a>
        `).join('')}
      </div>
    </section>` : ''}

    ${clavijeros.length ? `
    <section class="card" style="margin-bottom:1rem">
      <h3>Clavijeros — respuestas oficiales (PDF)</h3>
      <div class="topic-list">
        ${clavijeros.map(c => `
          <a class="topic-item" href="${c.path}" target="_blank" rel="noopener">
            <div><strong>Clavijero ${test?.short} — ${c.year}</strong><div class="topic-meta">${c.title}</div></div>
            <span class="badge">Respuestas</span>
          </a>
        `).join('')}
      </div>
    </section>` : ''}

    <h3 style="margin-bottom:0.75rem">Simulacros interactivos adicionales</h3>
    <div class="grid">
      ${essays.length ? essays.map(e => `
        <article class="card">
          <h3>${e.title}</h3>
          <p>${e.description}</p>
          <div class="topic-meta">${e.questionIds.length} preguntas · ${e.durationMinutes} min</div>
          <button class="btn btn-primary btn-block" style="margin-top:0.75rem" data-essay="${e.id}">Comenzar</button>
        </article>
      `).join('') : '<p class="empty">Más simulacros interactivos en desarrollo.</p>'}
    </div>
  `;

  container.querySelectorAll('[data-essay]').forEach(btn => {
    btn.addEventListener('click', () => startClassicEssay(container, btn.dataset.essay));
  });
}

async function startClassicEssay(container, essayId) {
  const essays = await loadEssays();
  const essay = essays.find(e => e.id === essayId);
  if (!essay) return;

  const { loadQuestions, normalizeQuestion } = await import('../question-bank.js');
  const all = (await loadQuestions(getCurrentTest())).map(normalizeQuestion);
  const questions = essay.questionIds.map(id => all.find(q => q.id === id)).filter(Boolean);
  const testId = getCurrentTest();

  const { runTimedEssay } = await import(`../exam-engine.js?v=${CACHE_VERSION}`);
  await runTimedEssay(container, {
    title: essay.title,
    description: essay.description,
    questions,
    durationMinutes: essay.durationMinutes,
    testId,
    essayType: 'practice',
  });
}
