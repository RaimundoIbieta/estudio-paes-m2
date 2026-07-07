import { getCurrentTest } from '../test-context.js';

const TEST_LABELS = {
  m1: 'M1 — Matemática',
  m2: 'M2 — Matemática',
  cl: 'Competencia Lectora',
  hcs: 'Historia y Ciencias Sociales',
  'ciencias-bio': 'Ciencias — Biología',
  'ciencias-fis': 'Ciencias — Física',
  'ciencias-qui': 'Ciencias — Química',
  ciencias: 'Ciencias',
  general: 'General',
};

const TEST_MAP = {
  m1: 'm1',
  m2: 'm2',
  cl: 'cl',
  hcs: 'hcs',
  ciencias: ['ciencias', 'ciencias-bio', 'ciencias-fis', 'ciencias-qui'],
};

let catalogCache = null;

async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const res = await fetch('data/biblioteca.json');
  catalogCache = await res.json();
  return catalogCache;
}

function filterForTest(items, testId) {
  if (!testId) return items;
  const keys = TEST_MAP[testId];
  if (Array.isArray(keys)) return items.filter(i => keys.includes(i.test) || i.test === 'ciencias');
  return items.filter(i => i.test === keys || i.test === testId);
}

function groupByKind(items) {
  const order = ['temario', 'prueba', 'clavijero'];
  const groups = {};
  for (const item of items) {
    if (!groups[item.kind]) groups[item.kind] = [];
    groups[item.kind].push(item);
  }
  const labels = { temario: 'Temarios oficiales DEMRE', prueba: 'Pruebas PAES oficiales', clavijero: 'Clavijeros (respuestas)' };
  return order.filter(k => groups[k]?.length).map(k => ({ kind: k, label: labels[k], items: groups[k] }));
}

export async function renderBiblioteca(container) {
  const testId = getCurrentTest();
  let items = [];
  try {
    items = await loadCatalog();
  } catch {
    container.innerHTML = `<div class="card"><h3>Biblioteca no disponible</h3><p>No se pudo cargar el catálogo.</p></div>`;
    return;
  }

  const filtered = filterForTest(items, testId);
  const groups = groupByKind(filtered.length ? filtered : items);

  container.innerHTML = `
    <h1 class="page-title">Biblioteca PAES</h1>
    <p class="page-sub">
      ${testId
        ? `Material para <strong>${TEST_LABELS[testId] || testId}</strong> + temarios y pruebas oficiales DEMRE (dic. 2024, 2025 y 2026).`
        : 'Temarios, pruebas oficiales PAES y clavijeros. Elige una prueba para filtrar.'}
    </p>

    <div class="filters" id="bib-filters">
      <button class="filter-btn ${!testId ? 'active' : ''}" data-filter="all">Todo</button>
      <button class="filter-btn" data-filter="temario">Temarios</button>
      <button class="filter-btn" data-filter="prueba">Pruebas PAES</button>
      <button class="filter-btn" data-filter="clavijero">Clavijeros</button>
    </div>

    <div id="bib-content">
      ${renderGroups(groups)}
    </div>

    ${testId === 'm2' ? `
    <section class="card" style="margin-top:1.5rem">
      <h3>Material M2 adicional</h3>
      <p class="page-sub">Resúmenes y guías de estudio.</p>
      <div class="topic-list">
        ${M2_EXTRA.map(doc => bibLink(doc, 'assets/m2/')).join('')}
      </div>
    </section>` : ''}
  `;

  container.querySelector('#bib-filters')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    container.querySelectorAll('#bib-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    const base = filterForTest(items, testId);
    const list = f === 'all' ? base : base.filter(i => i.kind === f);
    const g = groupByKind(list);
    container.querySelector('#bib-content').innerHTML = renderGroups(g);
  });
}

function renderGroups(groups) {
  if (!groups.length) return '<p class="empty">No hay documentos para este filtro.</p>';
  return groups.map(g => `
    <section class="card" style="margin-bottom:1rem">
      <h3>${g.label} (${g.items.length})</h3>
      <div class="topic-list" style="margin-top:0.75rem">
        ${g.items.map(doc => bibLink(doc, '')).join('')}
      </div>
    </section>
  `).join('');
}

function bibLink(doc, basePath) {
  const href = doc.path || `${basePath}${encodeURIComponent(doc.file)}`;
  const testLabel = TEST_LABELS[doc.test] || doc.test;
  return `
    <a class="topic-item" href="${href}" target="_blank" rel="noopener">
      <div>
        <strong>${doc.title}</strong>
        <div class="topic-meta">${doc.tag} · ${doc.year} · ${testLabel}</div>
      </div>
      <span class="badge">PDF</span>
    </a>`;
}

const M2_EXTRA = [
  { title: 'Resumen Eje Geometría M2', file: 'Resumen Eje Geometri_a M2_vf.pdf', tag: 'Resumen' },
  { title: 'Resumen Eje Álgebra y Funciones M2', file: 'Resumen Eje A_lgebra y Funciones M2_vf.pdf', tag: 'Resumen' },
  { title: 'Semana 1 PAES M2', file: 'SEMANA_1_PAES_M2.pdf', tag: 'Semana' },
  { title: 'Semana 2 PAES M2', file: 'SEMANA_2_PAES_M2.pdf', tag: 'Semana' },
  { title: 'Semana 3 PAES M2', file: 'SEMANA_3_PAES_M2.pdf', tag: 'Semana' },
];

export async function getOfficialExams(testId) {
  const items = await loadCatalog();
  return filterForTest(items, testId).filter(i => i.kind === 'prueba' || i.kind === 'clavijero');
}
