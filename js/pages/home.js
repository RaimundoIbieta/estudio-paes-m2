import { getStats } from '../storage.js';
import { getCurrentTest, loadTests, setCurrentTest, fetchTestData } from '../test-context.js';
import { getGate, getStudyRoadmap } from '../learning-path.js';
import { getUser, hasActiveSubscription } from '../auth.js';
import { summarizeTest } from './select-test.js';

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
  const tests = (await loadTests()).filter(t => t.ready);
  const stats = getStats(testId);

  const cards = [];
  for (const t of tests) {
    const lessons = (await fetchTestData(t.id, 'content')).filter(l => l.id !== 'placeholder');
    cards.push({ t, s: summarizeTest(t.id, lessons.length), lessons: lessons.length });
  }

  const active = testId ? tests.find(t => t.id === testId) : null;
  let activeBlock = '';
  if (active) {
    const gate = getGate(testId);
    const { steps } = await getStudyRoadmap(testId);
    const doneSteps = steps.filter(s => s.done).length;
    activeBlock = `
      <section class="card" style="margin-top:1rem;border-left:4px solid ${active.color}">
        <h3>Enfoque actual: ${active.short}</h3>
        <p class="page-sub">${gate.title} — ${gate.description}</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
          <a href="${gate.route}" class="btn btn-primary" data-route>${gate.type === 'study' ? 'Ir al contenido' : 'Resolver ahora'}</a>
          <a href="#/ejercicios" class="btn btn-secondary" data-route>Ejercicios</a>
          <a href="#/ensayos" class="btn btn-secondary" data-route>Ensayos</a>
          <a href="#/progreso" class="btn btn-secondary" data-route>Progreso (${doneSteps}/${steps.length})</a>
        </div>
        <p class="topic-meta" style="margin-top:0.75rem">Racha global: ${stats.streak || 0} día(s) · Precisión ejercicios: ${stats.accuracy || 0}%</p>
      </section>`;
  }

  container.innerHTML = `
    <section class="hero">
      <h1>Hola, ${user.name || user.email.split('@')[0]}</h1>
      <p>Prepara <strong>todas las PAES en paralelo</strong>. Cada prueba tiene su ruta independiente: elige cuál estudiar ahora y vuelve a las demás cuando quieras.</p>
    </section>

    <h2 style="margin:1rem 0 0.5rem;font-size:1.1rem">Tus pruebas</h2>
    <div class="grid">
      ${cards.map(({ t, s, lessons }) => `
        <article class="card test-card ${testId === t.id ? 'test-card-active' : ''}" style="border-top:4px solid ${t.color}">
          <div style="display:flex;justify-content:space-between;gap:0.5rem">
            <span class="badge" style="background:${t.color}22;color:${t.color}">${t.short}</span>
            ${testId === t.id ? '<span class="badge">Activa</span>' : ''}
          </div>
          <h3 style="margin-top:0.5rem">${t.name}</h3>
          <div class="progress-bar-wrap" style="margin-top:0.65rem">
            <div class="progress-label"><span>${s.status}</span><span>${s.lessonsDone}/${lessons}</span></div>
            <div class="progress-bar"><span style="width:${s.pct}%;background:${t.color}"></span></div>
          </div>
          <button type="button" class="btn ${testId === t.id ? 'btn-secondary' : 'btn-primary'} btn-block" style="margin-top:0.75rem" data-enter="${t.id}" data-goto="${s.route}">
            ${testId === t.id ? 'Seguir aquí' : s.cta}
          </button>
        </article>
      `).join('')}
    </div>

    ${activeBlock}

    <div class="grid" style="margin-top:1rem">
      <article class="card">
        <h3>📁 Biblioteca</h3>
        <p>Temarios, pruebas oficiales y clavijeros DEMRE de todas las materias.</p>
        <a href="#/biblioteca" class="btn btn-primary" data-route>Ver PDFs</a>
      </article>
      <article class="card">
        <h3>📊 Progreso global</h3>
        <p>Ruta detallada de la prueba activa y resumen de avance.</p>
        <a href="#/progreso" class="btn btn-secondary" data-route>Ver progreso</a>
      </article>
      <article class="card">
        <h3>🔀 Todas las pruebas</h3>
        <p>Panel completo con diagnóstico y porcentajes de cada una.</p>
        <a href="#/pruebas" class="btn btn-secondary" data-route>Mis pruebas</a>
      </article>
    </div>
  `;

  container.querySelectorAll('[data-enter]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentTest(btn.dataset.enter);
      location.hash = btn.dataset.goto || '#/app';
    });
  });
}
