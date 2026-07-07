import { getStats } from '../storage.js';

export async function renderProgress(container) {
  const stats = getStats();

  const areaStats = {};
  for (const [id, data] of Object.entries(stats.exercises)) {
    const area = id.split('-')[0];
    const areaName = { geo: 'Geometría', alg: 'Álgebra', num: 'Números', prob: 'Probabilidad' }[area] || area;
    if (!areaStats[areaName]) areaStats[areaName] = { attempts: 0, correct: 0 };
    areaStats[areaName].attempts += data.attempts;
    areaStats[areaName].correct += data.correct;
  }

  container.innerHTML = `
    <h1 class="page-title">Tu progreso</h1>
    <p class="page-sub">Estadísticas guardadas en este navegador.</p>

    <div class="results-grid">
      <div class="stat-box"><strong>${stats.totalAttempts}</strong><span>Respuestas totales</span></div>
      <div class="stat-box"><strong>${stats.accuracy}%</strong><span>Precisión global</span></div>
      <div class="stat-box"><strong>${stats.lessonsRead}</strong><span>Lecciones leídas</span></div>
      <div class="stat-box"><strong>${stats.essaysDone}</strong><span>Ensayos rendidos</span></div>
    </div>

    <section class="card" style="margin-top:1.25rem">
      <h3>Precisión por área</h3>
      ${Object.keys(areaStats).length ? Object.entries(areaStats).map(([area, d]) => {
        const pct = Math.round((d.correct / d.attempts) * 100);
        return `
          <div class="progress-bar-wrap">
            <div class="progress-label"><span>${area}</span><span>${pct}% (${d.correct}/${d.attempts})</span></div>
            <div class="progress-bar"><span style="width:${pct}%"></span></div>
          </div>
        `;
      }).join('') : '<p class="empty" style="padding:1rem">Aún no hay ejercicios resueltos.</p>'}
    </section>

    <section class="card" style="margin-top:1rem">
      <h3>Historial de ensayos</h3>
      ${stats.essays.length ? `
        <div class="topic-list">
          ${[...stats.essays].reverse().slice(0, 10).map(e => `
            <div class="topic-item" style="cursor:default">
              <div>
                <strong>${e.title}</strong>
                <div class="topic-meta">${new Date(e.date).toLocaleDateString('es-CL')} · ${e.correct}/${e.total} correctas</div>
              </div>
              <span class="badge">${e.score}%</span>
            </div>
          `).join('')}
        </div>
      ` : '<p class="empty" style="padding:1rem">Aún no has rendido ensayos.</p>'}
    </section>

    <div style="margin-top:1rem">
      <button class="btn btn-danger" id="reset-progress">Borrar todo el progreso</button>
    </div>
  `;

  container.querySelector('#reset-progress')?.addEventListener('click', () => {
    if (confirm('¿Seguro que quieres borrar todo tu progreso? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('estudio-paes-m2');
      renderProgress(container);
    }
  });
}
