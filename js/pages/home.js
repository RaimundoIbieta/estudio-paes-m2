import { getStats } from '../storage.js';
import { getCurrentTest, loadTests } from '../test-context.js';
import { getGate, getStudyRoadmap } from '../learning-path.js';
import { getUser, hasActiveSubscription } from '../auth.js';

export async function renderHome(container) {
  const user = getUser();
  if (!user) {
    location.hash = '#/';
    return;
  }
  if (!hasActiveSubscription()) {
    location.hash = '#/suscripcion';
    return;
  }

  const testId = getCurrentTest();
  const tests = await loadTests();
  const stats = getStats(testId);

  if (!testId) {
    container.innerHTML = `
      <section class="hero">
        <h1>Bienvenido, ${user.name || user.email.split('@')[0]}</h1>
        <p>Elige la prueba PAES que quieres preparar. Tu ruta comienza con un ensayo diagnóstico.</p>
        <a href="#/pruebas" class="btn btn-primary" style="margin-top:1rem" data-route>Elegir prueba PAES →</a>
      </section>
      <div class="grid">
        ${tests.filter(t => t.ready).map(t => `
          <article class="card" style="border-top:4px solid ${t.color}">
            <span class="badge">${t.short} · ${t.type}</span>
            <h3>${t.name}</h3>
            <p>${t.description}</p>
            <a href="#/pruebas" class="btn btn-secondary btn-block" data-route>Seleccionar</a>
          </article>
        `).join('')}
      </div>`;
    return;
  }

  const test = tests.find(t => t.id === testId);
  const gate = getGate(testId);
  const { steps } = await getStudyRoadmap(testId);
  const doneSteps = steps.filter(s => s.done).length;

  container.innerHTML = `
    <section class="hero" style="border-left:4px solid ${test?.color || '#1e5a9e'}">
      <span class="badge">${test?.short} · ${test?.name}</span>
      <h1>Tu preparación ${test?.short}</h1>
      <p><a href="#/pruebas" data-route>Cambiar prueba</a> · <a href="#/progreso" data-route>Ver progreso completo</a></p>
    </section>

    ${gate.blocked?.length ? `
    <section class="gate-banner card">
      <h3>⚡ Acción requerida</h3>
      <p><strong>${gate.title}</strong> — ${gate.description}</p>
      <a href="${gate.route}" class="btn btn-primary" data-route>Comenzar</a>
    </section>` : `
    <section class="card">
      <h3>✓ Puedes estudiar</h3>
      <p>Continúa con la siguiente unidad o practica ejercicios.</p>
      <a href="#/contenido" class="btn btn-primary" data-route>Ir al contenido</a>
    </section>`}

    <div class="grid" style="margin-top:1rem">
      <article class="card">
        <h3>📚 Contenido</h3>
        <p>Unidades con teoría y diagramas.</p>
        <a href="#/contenido" class="btn btn-primary" data-route>Ver unidades</a>
      </article>
      <article class="card">
        <h3>✏️ Ejercicios</h3>
        <p>Práctica con corrección inmediata.</p>
        <a href="#/ejercicios" class="btn btn-primary" data-route>Practicar</a>
      </article>
      <article class="card">
        <h3>⏱️ Ensayos</h3>
        <p>Simulacros y ensayos de la ruta.</p>
        <a href="#/ensayos" class="btn btn-primary" data-route>Ver ensayos</a>
      </article>
      <article class="card">
        <h3>📊 Progreso</h3>
        <p>${doneSteps}/${steps.length} pasos completados.</p>
        <a href="#/progreso" class="btn btn-secondary" data-route>Mi ruta</a>
      </article>
      ${testId === 'm2' ? `
      <article class="card">
        <h3>📁 Biblioteca</h3>
        <p>11 PDFs de material M2.</p>
        <a href="#/biblioteca" class="btn btn-primary" data-route>Ver PDFs</a>
      </article>` : ''}
    </div>

    <section class="card" style="margin-top:1.25rem">
      <h3>Resumen rápido</h3>
      <div class="results-grid" style="margin-top:0.75rem">
        <div class="stat-box"><strong>${stats.lessonsRead}</strong><span>Lecciones</span></div>
        <div class="stat-box"><strong>${stats.accuracy}%</strong><span>Precisión</span></div>
        <div class="stat-box"><strong>${(stats.testEssays || []).length}</strong><span>Ensayos</span></div>
      </div>
    </section>
  `;
}
