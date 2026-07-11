import { renderDiagram } from './diagrams.js';

export function getCurrentTest() {
  return localStorage.getItem('paes-test') || null;
}

export function setCurrentTest(testId) {
  localStorage.setItem('paes-test', testId);
}

export async function loadTests() {
  const res = await fetch('data/tests.json');
  return res.json();
}

export async function fetchTestData(testId, type) {
  const id = testId || getCurrentTest() || 'm2';
  try {
    const res = await fetch(`data/${id}/${type}.json`);
    if (res.ok) return res.json();
  } catch (_) {}
  if (id === 'm2') {
    const fallback = await fetch(`data/${type}.json`);
    return fallback.json();
  }
  return [];
}

function sectionParagraphs(sec) {
  if (Array.isArray(sec.paragraphs) && sec.paragraphs.length) {
    return sec.paragraphs.map(p => String(p).trim()).filter(Boolean);
  }
  if (sec.text) {
    return String(sec.text)
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);
  }
  return [];
}

export function renderSectionHtml(sec) {
  let html = `<h2>${sec.heading}</h2>`;
  for (const p of sectionParagraphs(sec)) {
    html += `<p>${p}</p>`;
  }
  if (sec.diagramType) html += `<div class="diagram-svg">${renderDiagram(sec.diagramType)}</div>`;
  else if (sec.diagram) html += `<div class="diagram">${sec.diagram}</div>`;
  if (sec.items) html += `<ul>${sec.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  if (sec.formulas) html += sec.formulas.map(f => `<div class="formula">${f}</div>`).join('');
  return html;
}
