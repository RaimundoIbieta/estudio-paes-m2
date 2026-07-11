import { getStats, resetProgress, getAchievements } from '../storage.js';
import { getCurrentTest, loadTests } from '../test-context.js';
import { getStudyRoadmap, getGate } from '../learning-path.js';
import { getUser } from '../auth.js';

function areaLabelFromQuestionId(id, testId) {
  const s = String(id || '').toLowerCase();
  if (s.includes('geo') || s.includes('angulo') || s.includes('triang') || s.includes('trig')) return 'Geometría';
  if (s.includes('alg') || s.includes('ecuacion') || s.includes('func') || s.includes('log')) return 'Álgebra';
  if (s.includes('num') || s.includes('porcent') || s.includes('potenc')) return 'Números';
  if (s.includes('prob') || s.includes('estad')) return 'Probabilidad';
  if (s.startsWith('cl-') || s.includes('localizar') || s.includes('interpret')) return 'Competencia Lectora';
  if (s.startsWith('hcs-')) return 'HCS';
  if (s.startsWith('ci-') || s.includes('bio') || s.includes('fis') || s.includes('quim')) return 'Ciencias';
  if (testId === 'm1') return 'M1';
  if (testId === 'm2') return 'M2';
  return (testId || 'general').toUpperCase();
}

export async function renderProgress(container) {
  try {
    const user = getUser();
    const testId = getCurrentTest();
    const tests = await loadTests();
    const test = tests.find(t => t.id === testId);
    const stats = getStats(testId);
    const { streak, badges } = getAchievements(testId);

    if (!testId) {
      container.innerHTML = `
        <h1 class="page-title">Tu progreso</h1>
        <div class="card"><p>Primero elige una prueba PAES para ver tu ruta de estudio.</p>
        <a href="#/pruebas" class="btn btn-primary" data-route>Elegir prueba</a></div>`;
      return;
    }

    const { steps, gate, testProgress } = await getStudyRoadmap(testId);

    const areaStats = {};
    for (const [id, data] of Object.entries(stats.exercises || {})) {
      if (!data) continue;
      const areaName = areaLabelFromQuestionId(id, testId);
      if (!areaStats[areaName]) areaStats[areaName] = { attempts: 0, correct: 0 };
      areaStats[areaName].attempts += data.attempts || 0;
      areaStats[areaName].correct += data.correct || 0;
    }

    const testEssays = (stats.essays || []).filter(e => e.testId === testId);

    container.innerHTML = `
      <h1 class="page-title">Tu progreso — ${test?.short || ''}</h1>
      <p class="page-sub">${user ? `Cuenta: ${user.email}` : 'Inicia sesión para guardar tu avance en este dispositivo.'}</p>

      ${gate.blocked?.length ? `
      <section class="gate-banner card">
        <h3>⚡ Siguiente paso obligatorio</h3>
        <p><strong>${gate.title}</strong> — ${gate.description}</p>
        <a href="${gate.route}" class="btn btn-primary" data-route>Comenzar ahora</a>
      </section>` : ''}

      <div class="results-grid" style="margin-top:1rem">
        <div class="stat-box"><strong>${streak}</strong><span>Racha (días)</span></div>
        <div class="stat-box"><strong>${badges.length}</strong><span>Logros</span></div>
        <div class="stat-box"><strong>${stats.accuracy || 0}%</strong><span>Precisión</span></div>
        <div class="stat-box"><strong>${testEssays.length}</strong><span>Ensayos</span></div>
      </div>

      ${badges.length ? `
      <section class="card" style="margin-top:1rem">
        <h3>Logros</h3>
        <div class="topic-list" style="margin-top:0.5rem">
          ${badges.map(b => `<div class="topic-item" style="cursor:default"><div><strong>${b.icon} ${b.label}</strong></div></div>`).join('')}
        </div>
      </section>` : ''}

      <section class="card" style="margin-top:1rem">
        <h3>Ruta de estudio</h3>
        <div class="roadmap">
          ${steps.map(step => `
            <div class="roadmap-step ${step.done ? 'done' : ''} ${step.current ? 'current' : ''}">
              <div class="roadmap-dot">${step.done ? '✓' : step.current ? '→' : '○'}</div>
              <div class="roadmap-body">
                <strong>${step.label}</strong>
                ${step.area ? `<div class="topic-meta">${step.area}</div>` : ''}
                ${step.score != null ? `<div class="topic-meta">Diagnóstico: ${step.score}%${step.paes != null ? ` · PAES ${step.paes}` : ''}</div>` : ''}
                ${step.lessonDone && !step.essayDone ? '<div class="topic-meta warn">Falta mini ensayo</div>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <div class="results-grid" style="margin-top:1rem">
        <div class="stat-box"><strong>${testProgress?.diagnosticDone ? '✓' : '—'}</strong><span>Diagnóstico</span></div>
        <div class="stat-box"><strong>${(testProgress?.lessonsCompleted || []).length}</strong><span>Unidades estudiadas</span></div>
        <div class="stat-box"><strong>${Object.keys(testProgress?.unitEssays || {}).length}</strong><span>Mini ensayos</span></div>
        <div class="stat-box"><strong>${(testProgress?.checkpoints || []).length}</strong><span>Ensayos progreso</span></div>
      </div>

      <div class="results-grid" style="margin-top:0.75rem">
        <div class="stat-box"><strong>${stats.totalAttempts || 0}</strong><span>Respuestas totales</span></div>
        <div class="stat-box"><strong>${stats.accuracy || 0}%</strong><span>Precisión global</span></div>
        <div class="stat-box"><strong>${testEssays.length}</strong><span>Ensayos rendidos</span></div>
        <div class="stat-box"><strong>${testEssays.length ? Math.round(testEssays.reduce((s,e)=>s+(e.score||0),0)/testEssays.length) : 0}%</strong><span>Promedio ensayos</span></div>
      </div>

      <section class="card" style="margin-top:1rem">
        <h3>Precisión por área (ejercicios)</h3>
        ${Object.keys(areaStats).length ? Object.entries(areaStats).map(([area, d]) => {
          const pct = d.attempts ? Math.round((d.correct / d.attempts) * 100) : 0;
          return `
            <div class="progress-bar-wrap">
              <div class="progress-label"><span>${area}</span><span>${pct}% (${d.correct}/${d.attempts})</span></div>
              <div class="progress-bar"><span style="width:${pct}%"></span></div>
            </div>`;
        }).join('') : '<p class="empty" style="padding:1rem">Aún no hay ejercicios resueltos.</p>'}
      </section>

      <section class="card" style="margin-top:1rem">
        <h3>Historial de ensayos — ${test?.short}</h3>
        ${testEssays.length ? `
          <div class="topic-list">
            ${[...testEssays].reverse().slice(0, 15).map(e => `
              <div class="topic-item" style="cursor:default">
                <div>
                  <strong>${e.title}</strong>
                  <div class="topic-meta">${new Date(e.date).toLocaleDateString('es-CL')} · ${e.correct}/${e.total} · ${e.essayType || 'ensayo'}${e.puntajePaes != null ? ` · PAES ${e.puntajePaes}` : ''}</div>
                </div>
                <span class="badge">${e.puntajePaes != null ? `PAES ${e.puntajePaes}` : `${e.score}%`}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p class="empty" style="padding:1rem">Aún no has rendido ensayos en esta prueba.</p>'}
      </section>

      <div style="margin-top:1rem">
        <button class="btn btn-danger" id="reset-progress">Borrar progreso de este navegador</button>
      </div>
    `;

    container.querySelector('#reset-progress')?.addEventListener('click', () => {
      if (confirm('¿Seguro? Se borrará todo tu progreso local.')) {
        resetProgress();
        renderProgress(container);
      }
    });
  } catch (err) {
    container.innerHTML = `
      <div class="card">
        <h3>Error al cargar progreso</h3>
        <p>${err.message}</p>
        <button class="btn btn-primary" id="retry-progress">Reintentar</button>
      </div>`;
    container.querySelector('#retry-progress')?.addEventListener('click', () => renderProgress(container));
  }
}
