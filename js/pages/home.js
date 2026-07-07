import { getStats } from '../storage.js';
import { getCurrentTest, loadTests } from '../test-context.js';

export async function renderHome(container) {
  const stats = getStats();
  const testId = getCurrentTest();
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);

  if (!testId) {
    container.innerHTML = `
      <section class="hero">
        <h1>Preuniversitario PAES — acceso masivo</h1>
        <p>Estudia gratis para la PAES: elige tu prueba, repasa teoría, practica ejercicios y rinde ensayos.</p>
        <a href="#/pruebas" class="btn btn-primary" style="margin-top:1rem" data-route>Elegir prueba PAES →</a>
      </section>
      <div class="grid">
        ${tests.map(t => `
          <article class="card" style="border-top:4px solid ${t.color}">
            <span class="badge">${t.short} · ${t.type}</span>
            <h3>${t.name}</h3>
            <p>${t.description}</p>
            ${t.ready ? `<a href="#/pruebas" class="btn btn-secondary btn-block" data-route>Seleccionar</a>` : '<span class="topic-meta">Próximamente</span>'}
          </article>
        `).join('')}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <section class="hero" style="border-left:4px solid ${test?.color || '#1e5a9e'}">
      <span class="badge">${test?.short} · ${test?.name}</span>
      <h1>Prepara tu ${test?.short}</h1>
      <p>Contenido, ejercicios y ensayos para la PAES. <a href="#/pruebas" data-route>Cambiar prueba</a></p>
    </section>
    <div class="grid">
      <article class="card">
        <h3>📚 Contenido</h3>
        <p>Resúmenes con diagramas claros y fórmulas.</p>
        <a href="#/contenido" class="btn btn-primary" data-route>Ver temas</a>
      </article>
      <article class="card">
        <h3>✏️ Ejercicios</h3>
        <p>Preguntas con corrección y explicación.</p>
        <a href="#/ejercicios" class="btn btn-primary" data-route>Practicar</a>
      </article>
      <article class="card">
        <h3>⏱️ Ensayos</h3>
        <p>Simulacros cronometrados (${test?.durationMinutes} min reales).</p>
        <a href="#/ensayos" class="btn btn-primary" data-route>Rendir ensayo</a>
      </article>
      <article class="card">
        <h3>📊 Progreso</h3>
        <p>Tu avance en esta prueba.</p>
        <a href="#/progreso" class="btn btn-secondary" data-route>Ver estadísticas</a>
      </article>
    </div>
    <section class="card" style="margin-top:1.25rem">
      <h3>Tu resumen — ${test?.short}</h3>
      <div class="results-grid" style="margin-top:0.75rem">
        <div class="stat-box"><strong>${stats.lessonsRead}</strong><span>Lecciones</span></div>
        <div class="stat-box"><strong>${stats.accuracy}%</strong><span>Precisión</span></div>
        <div class="stat-box"><strong>${stats.essaysDone}</strong><span>Ensayos</span></div>
      </div>
    </section>
  `;
}
