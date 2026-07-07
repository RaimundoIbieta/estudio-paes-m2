import { completeLesson } from '../storage.js';
import { getCurrentTest, fetchTestData, loadTests, renderSectionHtml } from '../test-context.js';
import { getGate, getUnlockedLessonIds } from '../learning-path.js';

export async function loadContent() {
  return fetchTestData(null, 'content');
}

export async function renderContentList(container) {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }

  const gate = getGate(testId);
  if (gate.blocked?.includes('contenido')) {
    container.innerHTML = `
      <h1 class="page-title">Contenido bloqueado</h1>
      <section class="gate-banner card">
        <h3>${gate.title}</h3>
        <p>${gate.description}</p>
        <a href="${gate.route}" class="btn btn-primary" data-route>Ir al ensayo obligatorio</a>
        <a href="#/progreso" class="btn btn-secondary" data-route style="margin-left:0.5rem">Ver mi progreso</a>
      </section>`;
    return;
  }

  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const topics = (await loadContent()).filter(t => t.id !== 'placeholder');
  const unlocked = new Set(await getUnlockedLessonIds(testId));
  const areas = [...new Set(topics.map(t => t.area))];

  container.innerHTML = `
    <h1 class="page-title">Contenido — ${test?.short || testId.toUpperCase()}</h1>
    <p class="page-sub">Estudia unidad por unidad. Después de cada una rendirás un mini ensayo obligatorio.</p>
    <div class="filters" id="area-filters">
      <button class="filter-btn active" data-area="all">Todos</button>
      ${areas.map(a => `<button class="filter-btn" data-area="${a}">${a}</button>`).join('')}
    </div>
    <div class="topic-list" id="topic-list">
      ${topics.map(t => topicCard(t, unlocked.has(t.id))).join('')}
    </div>
  `;

  container.querySelector('#area-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-area]');
    if (!btn) return;
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const area = btn.dataset.area;
    const filtered = area === 'all' ? topics : topics.filter(t => t.area === area);
    container.querySelector('#topic-list').innerHTML = filtered.map(t => topicCard(t, unlocked.has(t.id))).join('');
  });
}

function topicCard(t, unlocked) {
  if (!unlocked) {
    return `
      <div class="topic-item topic-locked">
        <div>
          <strong>${t.title}</strong>
          <div class="topic-meta">${t.area} · Bloqueada — completa la unidad anterior</div>
        </div>
        <span class="badge">🔒</span>
      </div>`;
  }
  return `
    <a href="#/contenido/${t.id}" class="topic-item" data-route>
      <div>
        <strong>${t.title}</strong>
        <div class="topic-meta">${t.area} · ${t.duration}</div>
      </div>
      <span class="badge">Leer</span>
    </a>`;
}

export async function renderLesson(container, id) {
  const testId = getCurrentTest();
  const gate = getGate(testId);
  if (gate.blocked?.includes('contenido')) {
    location.hash = gate.route.replace('#', '');
    return;
  }

  const unlocked = await getUnlockedLessonIds(testId);
  if (!unlocked.includes(id)) {
    container.innerHTML = `
      <div class="card"><h3>Unidad bloqueada</h3>
      <p>Completa el mini ensayo de la unidad anterior para continuar.</p>
      <a href="#/progreso" class="btn btn-primary" data-route>Ver mi ruta</a></div>`;
    return;
  }

  const topics = await loadContent();
  const lesson = topics.find(t => t.id === id);
  if (!lesson) {
    container.innerHTML = `<p class="empty">Tema no encontrado.</p>`;
    return;
  }

  container.innerHTML = `
    <a href="#/contenido" class="back-link" data-route>← Volver a contenido</a>
    <article class="lesson">
      <span class="badge">${lesson.area}</span>
      <h1 class="page-title" style="margin-top:0.5rem">${lesson.title}</h1>
      <p class="page-sub">${lesson.duration} de lectura estimada</p>
      ${lesson.sections.map(renderSectionHtml).join('')}
    </article>
    <div style="margin-top:1rem;display:flex;gap:0.75rem;flex-wrap:wrap">
      <button class="btn btn-primary" id="finish-lesson">Terminé esta unidad → Mini ensayo</button>
      <a href="#/ejercicios" class="btn btn-secondary" data-route>Practicar ejercicios</a>
    </div>
  `;

  container.querySelector('#finish-lesson').addEventListener('click', () => {
    completeLesson(testId, id);
    location.hash = `#/ensayo/unidad/${id}`;
  });
}
