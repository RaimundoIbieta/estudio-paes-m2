import { getStats } from '../storage.js';

export function renderHome(container) {
  const stats = getStats();
  container.innerHTML = `
    <section class="hero">
      <h1>Prepara tu PAES M2</h1>
      <p>Estudia teoría, practica con ejercicios corregidos y rinde ensayos cronometrados.
         Tu avance se guarda automáticamente en este dispositivo.</p>
    </section>

    <div class="grid">
      <article class="card">
        <h3>📚 Contenido</h3>
        <p>Resúmenes de geometría, álgebra, números y probabilidad con fórmulas y ejemplos.</p>
        <a href="#/contenido" class="btn btn-primary" data-route>Ver temas</a>
      </article>
      <article class="card">
        <h3>✏️ Ejercicios</h3>
        <p>Preguntas de alternativa con corrección inmediata y explicación paso a paso.</p>
        <a href="#/ejercicios" class="btn btn-primary" data-route>Practicar</a>
      </article>
      <article class="card">
        <h3>⏱️ Ensayos</h3>
        <p>Simulacros con cronómetro para entrenar como en la prueba real.</p>
        <a href="#/ensayos" class="btn btn-primary" data-route>Rendir ensayo</a>
      </article>
      <article class="card">
        <h3>📊 Progreso</h3>
        <p>Revisa tu precisión, ensayos rendidos y temas estudiados.</p>
        <a href="#/progreso" class="btn btn-secondary" data-route>Ver estadísticas</a>
      </article>
    </div>

    <section class="card" style="margin-top:1.25rem">
      <h3>Tu resumen rápido</h3>
      <div class="results-grid" style="margin-top:0.75rem">
        <div class="stat-box"><strong>${stats.lessonsRead}</strong><span>Lecciones leídas</span></div>
        <div class="stat-box"><strong>${stats.accuracy}%</strong><span>Precisión ejercicios</span></div>
        <div class="stat-box"><strong>${stats.essaysDone}</strong><span>Ensayos rendidos</span></div>
        <div class="stat-box"><strong>${stats.avgEssay || '—'}</strong><span>Promedio ensayos</span></div>
      </div>
    </section>
  `;
}
