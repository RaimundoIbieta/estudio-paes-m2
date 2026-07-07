import { getCurrentTest } from '../test-context.js';

const M2_LIBRARY = [
  { title: 'Temario oficial PAES M2 (DEMRE 2027)', file: '2027-26-03-19-temario-paes-regular-m2.pdf', tag: 'Oficial' },
  { title: 'Resumen Eje Geometría M2', file: 'Resumen Eje Geometri_a M2_vf.pdf', tag: 'Resumen' },
  { title: 'Resumen Eje Álgebra y Funciones M2', file: 'Resumen Eje A_lgebra y Funciones M2_vf.pdf', tag: 'Resumen' },
  { title: 'Resumen Eje Números M2', file: 'Resumen Eje Nu_meros M2_vf.pdf', tag: 'Resumen' },
  { title: 'Resumen Eje Probabilidad y Estadística M2', file: 'Resumen Eje Probabilidad y Estadi_stica M2_vf.pdf', tag: 'Resumen' },
  { title: 'Guía: Funciones exponenciales y logaritmos', file: 'Gui_a-N_-3-Matema_tica-Modelado-del-mundo-con-funciones-exponenciales-y-logaritmos.pdf', tag: 'Guía' },
  { title: 'Semana 1 PAES M2', file: 'SEMANA_1_PAES_M2.pdf', tag: 'Semana' },
  { title: 'Resumen Semana 1', file: 'Resumen_Semana_1 (5).pdf', tag: 'Semana' },
  { title: 'Semana 2 PAES M2', file: 'SEMANA_2_PAES_M2.pdf', tag: 'Semana' },
  { title: 'Resumen Semana 2', file: 'Resumen_Semana_2.pdf', tag: 'Semana' },
  { title: 'Semana 3 PAES M2', file: 'SEMANA_3_PAES_M2.pdf', tag: 'Semana' },
];

export function renderBiblioteca(container) {
  const testId = getCurrentTest();
  const items = testId === 'm2' || !testId ? M2_LIBRARY : [];

  container.innerHTML = `
    <h1 class="page-title">Biblioteca de materiales</h1>
    <p class="page-sub">PDFs de estudio descargables. ${testId === 'm2' ? 'Material M2 importado de tu carpeta.' : 'Selecciona M2 para ver todos los documentos.'}</p>
    ${!items.length ? `
      <div class="card"><p>Próximamente materiales para esta prueba.</p>
      <a href="#/pruebas" class="btn btn-primary" data-route>Elegir prueba M2</a></div>
    ` : `
    <div class="topic-list">
      ${items.map(doc => `
        <a class="topic-item" href="assets/m2/${encodeURIComponent(doc.file)}" target="_blank" rel="noopener">
          <div>
            <strong>${doc.title}</strong>
            <div class="topic-meta">PDF · ${doc.tag}</div>
          </div>
          <span class="badge">Abrir</span>
        </a>
      `).join('')}
    </div>
    `}
  `;
}
