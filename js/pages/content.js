import { markLessonRead } from '../storage.js';
import { getCurrentTest, fetchTestData, loadTests, renderSectionHtml } from '../test-context.js';

export async function loadContent() {
  return fetchTestData(null, 'content');
}

export async function renderContentList(container) {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const topics = await loadContent();
  const areas = [...new Set(topics.map(t => t.area))];

  container.innerHTML = `
    <h1 class="page-title">Contenido — ${test?.short || testId.toUpperCase()}</h1>
    <p class="page-sub">${test?.description || ''}</p>
    <div class="filters" id="area-filters">
      <button class="filter-btn active" data-area="all">Todos</button>
      ${areas.map(a => `<button class="filter-btn" data-area="${a}">${a}</button>`).join('')}
    </div>
    <div class="topic-list" id="topic-list">
      ${topics.map(t => topicCard(t)).join('')}
    </div>
  `;

  container.querySelector('#area-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-area]');
    if (!btn) return;
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const area = btn.dataset.area;
    const filtered = area === 'all' ? topics : topics.filter(t => t.area === area);
    container.querySelector('#topic-list').innerHTML = filtered.map(t => topicCard(t)).join('');
  });
}

function topicCard(t) {
  return `
    <a href="#/contenido/${t.id}" class="topic-item" data-route>
      <div>
        <strong>${t.title}</strong>
        <div class="topic-meta">${t.area} · ${t.duration}</div>
      </div>
      <span class="badge">Leer</span>
    </a>
  `;
}

export async function renderLesson(container, id) {
  const topics = await loadContent();
  const lesson = topics.find(t => t.id === id);
  if (!lesson) {
    container.innerHTML = `<p class="empty">Tema no encontrado.</p>`;
    return;
  }

  markLessonRead(id);

  container.innerHTML = `
    <a href="#/contenido" class="back-link" data-route>← Volver a contenido</a>
    <article class="lesson">
      <span class="badge">${lesson.area}</span>
      <h1 class="page-title" style="margin-top:0.5rem">${lesson.title}</h1>
      <p class="page-sub">${lesson.duration} de lectura estimada</p>
      ${lesson.sections.map(renderSectionHtml).join('')}
    </article>
    <div style="margin-top:1rem;display:flex;gap:0.75rem;flex-wrap:wrap">
      <a href="#/ejercicios" class="btn btn-primary" data-route>Practicar ejercicios</a>
    </div>
  `;
}
