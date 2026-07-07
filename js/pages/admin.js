import { isSuperAdmin, fetchAllProfiles } from '../auth.js';
import { loadTests } from '../test-context.js';

export async function renderAdmin(container) {
  if (!isSuperAdmin()) {
    container.innerHTML = `
      <div class="card"><h2>Acceso restringido</h2>
      <p>Solo el superadministrador puede ver este panel.</p>
      <a href="#/" class="btn btn-secondary" data-route>Volver</a></div>`;
    return;
  }

  const [profiles, tests] = await Promise.all([fetchAllProfiles(), loadTests()]);
  const ready = tests.filter(t => t.ready).length;

  container.innerHTML = `
    <h1 class="page-title">Panel superadmin</h1>
    <p class="page-sub">raimundoibieta@gmail.com · Preuniversitario PAES</p>
    <div class="results-grid">
      <div class="stat-box"><strong>${profiles.length}</strong><span>Usuarios</span></div>
      <div class="stat-box"><strong>${ready}/${tests.length}</strong><span>Pruebas activas</span></div>
    </div>
    <section class="card" style="margin-top:1rem">
      <h3>Usuarios registrados</h3>
      <div class="topic-list">
        ${profiles.length ? profiles.map(p => `
          <div class="topic-item" style="cursor:default">
            <div><strong>${p.email}</strong><div class="topic-meta">${p.role} · ${new Date(p.created_at).toLocaleDateString('es-CL')}</div></div>
            <span class="badge">${p.role}</span>
          </div>
        `).join('') : '<p class="empty">Aún no hay usuarios con Supabase configurado.</p>'}
      </div>
    </section>
    <section class="card" style="margin-top:1rem">
      <h3>Próximos pasos</h3>
      <ul>
        <li>Importar contenido del zip M2 PAES a <code>data/m2/</code></li>
        <li>Activar CL, HCS y Ciencias según temarios DEMRE</li>
        <li>Agregar ensayos completos (65 preguntas M1, 55 M2)</li>
      </ul>
    </section>
  `;
}
