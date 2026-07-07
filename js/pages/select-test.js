import { getCurrentTest, loadTests, setCurrentTest } from '../test-context.js';
import { getTestProgress } from '../storage.js';

export async function renderSelectTest(container) {
  const tests = await loadTests();
  const current = getCurrentTest();

  container.innerHTML = `
    <h1 class="page-title">Elige tu prueba PAES</h1>
    <p class="page-sub">Al elegir una prueba comenzarás con el <strong>ensayo diagnóstico</strong>. Es tu punto de partida obligatorio.</p>
    <div class="grid">
      ${tests.map(t => `
        <article class="card test-card ${current === t.id ? 'test-card-active' : ''}" data-test="${t.id}" style="border-top:4px solid ${t.color}">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <span class="badge" style="background:${t.color}22;color:${t.color}">${t.short}</span>
            <span class="badge">${t.type}</span>
          </div>
          <h3 style="margin-top:0.6rem">${t.name}</h3>
          <p>${t.description}</p>
          <div class="topic-meta">${t.questions} preguntas · ${t.durationMinutes} min</div>
          ${t.ready
            ? `<button class="btn btn-primary btn-block" style="margin-top:0.75rem" data-select="${t.id}">${current === t.id ? 'Seleccionada ✓' : 'Estudiar esta prueba'}</button>`
            : `<button class="btn btn-secondary btn-block" style="margin-top:0.75rem" disabled>Próximamente</button>`
          }
        </article>
      `).join('')}
    </div>
    ${current ? `<p style="margin-top:1rem;text-align:center"><a href="#/app" class="btn btn-primary" data-route>Ir al panel →</a></p>` : ''}
  `;

  container.querySelectorAll('[data-select]').forEach(btn => {
    btn.addEventListener('click', () => {
      const testId = btn.dataset.select;
      setCurrentTest(testId);
      const tp = getTestProgress(testId);
      location.hash = tp.diagnosticDone ? '#/app' : '#/ensayo/diagnostico';
    });
  });
}
