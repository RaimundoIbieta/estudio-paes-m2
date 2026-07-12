import { getCurrentTest, loadTests, setCurrentTest, fetchTestData } from '../test-context.js';
import { getTestProgress } from '../storage.js';
import { getGate } from '../learning-path.js';

export function summarizeTest(testId, lessonsTotal = 0) {
  const tp = getTestProgress(testId);
  const lessonsDone = (tp.lessonsCompleted || []).length;
  const essaysDone = Object.keys(tp.unitEssays || {}).length;
  const checkpoints = (tp.checkpoints || []).length;
  const gate = getGate(testId);
  let status = 'Sin empezar';
  let cta = 'Comenzar diagnóstico';
  let route = '#/ensayo/diagnostico';
  if (tp.diagnosticDone) {
    status = gate.type === 'study'
      ? `Estudiando · ${lessonsDone} unidad(es)`
      : gate.title;
    cta = gate.type === 'study' ? 'Continuar estudiando' : 'Resolver pendiente';
    route = gate.route || '#/app';
  }
  const pct = lessonsTotal
    ? Math.min(100, Math.round((lessonsDone / Math.max(1, lessonsTotal)) * 100))
    : (tp.diagnosticDone ? 8 : 0);
  return {
    tp,
    lessonsDone,
    essaysDone,
    checkpoints,
    gate,
    status,
    cta,
    route,
    pct,
    diagnosticDone: !!tp.diagnosticDone,
  };
}

export async function renderSelectTest(container) {
  const tests = (await loadTests()).filter(t => t.ready);
  const current = getCurrentTest();

  const cards = [];
  for (const t of tests) {
    const lessons = (await fetchTestData(t.id, 'content')).filter(l => l.id !== 'placeholder');
    const s = summarizeTest(t.id, lessons.length);
    cards.push({ t, s, lessons: lessons.length });
  }

  container.innerHTML = `
    <h1 class="page-title">Mis pruebas PAES</h1>
    <p class="page-sub">Puedes preparar <strong>todas las pruebas a la vez</strong>. Cada una guarda su propio diagnóstico, contenido y progreso. Cambia cuando quieras sin perder avance.</p>
    <div class="grid">
      ${cards.map(({ t, s, lessons }) => `
        <article class="card test-card ${current === t.id ? 'test-card-active' : ''}" style="border-top:4px solid ${t.color}">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:0.5rem">
            <span class="badge" style="background:${t.color}22;color:${t.color}">${t.short}</span>
            ${current === t.id ? '<span class="badge">Activa ahora</span>' : `<span class="badge">${t.type}</span>`}
          </div>
          <h3 style="margin-top:0.6rem">${t.name}</h3>
          <p>${t.description}</p>
          <div class="topic-meta">${t.questions} preguntas · ${t.durationMinutes} min · ${lessons} unidades</div>
          <div class="progress-bar-wrap" style="margin-top:0.75rem">
            <div class="progress-label"><span>${s.status}</span><span>${s.pct}%</span></div>
            <div class="progress-bar"><span style="width:${s.pct}%;background:${t.color}"></span></div>
          </div>
          <div class="topic-meta" style="margin-top:0.4rem">
            Diagnóstico: ${s.diagnosticDone ? '✓' : '—'} ·
            Unidades: ${s.lessonsDone}/${lessons} ·
            Mini ensayos: ${s.essaysDone} ·
            Ensayos progreso: ${s.checkpoints}
          </div>
          <button type="button" class="btn btn-primary btn-block" style="margin-top:0.75rem" data-enter="${t.id}" data-goto="${s.route}">
            ${s.cta}
          </button>
        </article>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('[data-enter]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentTest(btn.dataset.enter);
      location.hash = btn.dataset.goto || '#/app';
    });
  });
}
