import { markLessonRead } from '../storage.js';

let contentData = null;

export async function loadContent() {
  if (!contentData) {
    const res = await fetch('data/content.json');
    contentData = await res.json();
  }
  return contentData;
}

export async function renderContentList(container) {
  const topics = await loadContent();
  const areas = [...new Set(topics.map(t => t.area))];

  container.innerHTML = `
    <h1 class="page-title">Contenido teórico</h1>
    <p class="page-sub">Resúmenes organizados por área para la PAES M2.</p>
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
    bindTopicLinks(container);
  });

  bindTopicLinks(container);
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

function bindTopicLinks(container) {
  container.querySelectorAll('.topic-item').forEach(el => {
    el.addEventListener('click', () => {});
  });
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
      ${lesson.sections.map(renderSection).join('')}
    </article>
    <div style="margin-top:1rem;display:flex;gap:0.75rem;flex-wrap:wrap">
      <a href="#/ejercicios" class="btn btn-primary" data-route>Practicar ejercicios</a>
      <a href="#/contenido" class="btn btn-secondary" data-route>Siguiente tema</a>
    </div>
  `;
}

function renderSection(sec) {
  let html = `<h2>${sec.heading}</h2>`;
  if (sec.text) html += `<p>${sec.text}</p>`;
  if (sec.diagram) html += `<div class="diagram">${sec.diagram}</div>`;
  if (sec.items) html += `<ul>${sec.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  if (sec.formulas) html += sec.formulas.map(f => `<div class="formula">${f}</div>`).join('');
  return html;
}
