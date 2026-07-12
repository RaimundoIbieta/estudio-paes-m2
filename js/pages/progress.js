import { getStats, resetProgress, getAchievements, getTestProgress } from '../storage.js';
import { getCurrentTest, loadTests, setCurrentTest, fetchTestData } from '../test-context.js';
import { getStudyRoadmap, getGate } from '../learning-path.js';
import { getUser } from '../auth.js';
import { summarizeTest } from './select-test.js';

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

function bindFocus(container) {
  container.querySelectorAll('[data-focus]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentTest(btn.dataset.focus);
      const tp = getTestProgress(btn.dataset.focus);
      if (tp.diagnosticDone) {
        location.hash = '#/progreso';
        renderProgress(container);
      } else {
        location.hash = '#/ensayo/diagnostico';
      }
    });
  });
}

export async function renderProgress(container) {
  try {
    const user = getUser();
    const testId = getCurrentTest();
    const tests = (await loadTests()).filter(t => t.ready);
    const test = tests.find(t => t.id === testId);
    const stats = getStats(testId);
    const { streak, badges } = getAchievements(testId);

    const allCards = [];
    for (const t of tests) {
      const lessons = (await fetchTestData(t.id, 'content')).filter(l => l.id !== 'placeholder');
      allCards.push({ t, s: summarizeTest(t.id, lessons.length), lessons: lessons.length });
    }

    const overview = `
      <section class="card" style="margin-bottom:1rem">
        <h3>Avance en todas las pruebas</h3>
        <p class="page-sub">Puedes estudiar varias PAES en paralelo. Toca una para enfocarte en ella.</p>
        <div class="grid" style="margin-top:0.75rem">
          ${allCards.map(({ t, s, lessons }) => `
            <button type="button" class="card test-card ${testId === t.id ? 'test-card-active' : ''}" data-focus="${t.id}"
              style="border-top:4px solid ${t.color};text-align:left;cursor:pointer;width:100%">
              <strong>${t.short}</strong>
              <div class="topic-meta">${s.status}</div>
              <div class="progress-bar-wrap" style="margin-top:0.4rem">
                <div class="progress-bar"><span style="width:${s.pct}%;background:${t.color}"></span></div>
              </div>
              <div class="topic-meta">${s.lessonsDone}/${lessons} unidades · Diag. ${s.diagnosticDone ? '✓' : '—'}</div>
            </button>
          `).join('')}
        </div>
      </section>`;

    if (!testId) {
      container.innerHTML = `
        <h1 class="page-title">Tu progreso</h1>
        ${overview}
        <div class="card"><p>Elige una prueba para ver la ruta detallada.</p>
        <a href="#/pruebas" class="btn btn-primary" data-route>Mis pruebas</a></div>`;
      bindFocus(container);
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
      <p class="page-sub">${user ? `Cuenta: ${user.email}` : 'Inicia sesión para guardar tu avance en este dispositivo.'} · Ruta detallada de la prueba activa.</p>

      ${overview}

      ${gate.blocked?.length ? `
      <section class="gate-banner card">
        <h3>⚡ Siguiente paso obligatorio (${test?.short})</h3>
        <p><strong>${gate.title}</strong> — ${gate.description}</p>
        <a href="${gate.route}" class="btn btn-primary" data-route>Comenzar ahora</a>
      </section>` : ''}

      <div class="results-grid" style="margin-top:1rem">
        <div class="stat-box"><strong>${streak}</strong><span>Racha (días)</span></div>
        <div class="stat-box"><strong>${badges.length}</strong><span>Logros</span></div>
        <div class="stat-box"><strong>${stats.accuracy || 0}%</strong><span>Precisión</span></div>
        <div class="stat-box"><strong>${testEssays.length}</strong><span>Ensayos ${test?.short || ''}</span></div>
      </div>

      ${badges.length ? `
      <section class="card" style="margin-top:1rem">
        <h3>Logros</h3>
        <div class="topic-list" style="margin-top:0.5rem">
          ${badges.map(b => `<div class="topic-item" style="cursor:default"><div><strong>${b.icon} ${b.label}</strong></div></div>`).join('')}
        </div>
      </section>` : ''}

      <section class="card" style="margin-top:1rem">
        <h3>Ruta de estudio — ${test?.short}</h3>
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
        <div class="stat-box"><strong>${(testProgress?.lessonsCompleted || []).length}</strong><span>Unidades</span></div>
        <div class="stat-box"><strong>${Object.keys(testProgress?.unitEssays || {}).length}</strong><span>Mini ensayos</span></div>
        <div class="stat-box"><strong>${(testProgress?.checkpoints || []).length}</strong><span>Ensayos progreso</span></div>
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

    bindFocus(container);
    container.querySelector('#reset-progress')?.addEventListener('click', () => {
      if (confirm('¿Seguro? Se borrará todo tu progreso local de todas las pruebas.')) {
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
