import { recordEssay } from '../storage.js';
import { getCurrentTest, fetchTestData, loadTests } from '../test-context.js';
import { getGate } from '../learning-path.js';
import { startPathEssay } from '../essay-runner.js';

export async function loadExercises() {
  return fetchTestData(null, 'exercises');
}

export async function loadEssays() {
  return fetchTestData(null, 'essays');
}

export async function renderEssays(container) {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const essays = await loadEssays();
  const gate = getGate(testId);

  container.innerHTML = `
    <h1 class="page-title">Ensayos — ${test?.short || ''}</h1>
    <p class="page-sub">Ensayos de la ruta de estudio y simulacros adicionales.</p>

    <section class="card" style="margin-bottom:1rem">
      <h3>Ensayos de tu ruta</h3>
      <div class="topic-list">
        <a class="topic-item" href="#/ensayo/diagnostico" data-route>
          <div><strong>Ensayo diagnóstico inicial</strong><div class="topic-meta">Obligatorio antes del contenido · ~35 preguntas</div></div>
          <span class="badge">${gate.type === 'diagnostic' ? 'Pendiente' : '✓'}</span>
        </a>
        <a class="topic-item" href="#/ensayo/progreso" data-route>
          <div><strong>Ensayo de progreso</strong><div class="topic-meta">Cada 2 unidades · ~35 preguntas</div></div>
          <span class="badge">Ruta</span>
        </a>
      </div>
    </section>

    <h3 style="margin-bottom:0.75rem">Simulacros adicionales</h3>
    <div class="grid">
      ${essays.length ? essays.map(e => `
        <article class="card">
          <h3>${e.title}</h3>
          <p>${e.description}</p>
          <div class="topic-meta">${e.questionIds.length} preguntas · ${e.durationMinutes} min</div>
          <button class="btn btn-primary btn-block" style="margin-top:0.75rem" data-essay="${e.id}">Comenzar</button>
        </article>
      `).join('') : '<p class="empty">Más simulacros próximamente.</p>'}
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

  const all = await loadExercises();
  const questions = essay.questionIds.map(id => all.find(q => q.id === id)).filter(Boolean);
  const testId = getCurrentTest();

  const { runTimedEssay } = await import('../essay-runner.js');
  await runTimedEssay(container, {
    title: essay.title,
    description: essay.description,
    questions,
    durationMinutes: essay.durationMinutes,
    testId,
    essayType: 'practice',
  });
}
