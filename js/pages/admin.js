import { isSuperAdmin, fetchAllProfiles, grantSubscription } from '../auth.js';
import { loadTests } from '../test-context.js';
import { APP_CONFIG } from '../config.js';

export async function renderAdmin(container) {
  if (!isSuperAdmin()) {
    container.innerHTML = `
      <div class="card"><h2>Acceso restringido</h2>
      <p>Solo el superadministrador (${APP_CONFIG.superadminEmail}) puede ver este panel.</p>
      <a href="#/app" class="btn btn-secondary" data-route>Volver</a></div>`;
    return;
  }

  const [profiles, tests] = await Promise.all([fetchAllProfiles(), loadTests()]);
  const ready = tests.filter(t => t.ready).length;

  container.innerHTML = `
    <h1 class="page-title">Panel superadmin</h1>
    <p class="page-sub">Gestión de usuarios, suscripciones y contenido de la plataforma.</p>
    <div class="results-grid">
      <div class="stat-box"><strong>${profiles.length}</strong><span>Usuarios</span></div>
      <div class="stat-box"><strong>${ready}/${tests.length}</strong><span>Pruebas activas</span></div>
      <div class="stat-box"><strong>${APP_CONFIG.pricing.label}</strong><span>Plan actual</span></div>
    </div>

    <section class="card" style="margin-top:1rem">
      <h3>Usuarios registrados</h3>
      <div class="topic-list">
        ${profiles.length ? profiles.map(p => `
          <div class="topic-item" style="cursor:default">
            <div><strong>${p.email}</strong><div class="topic-meta">${p.role} · ${new Date(p.created_at).toLocaleDateString('es-CL')}</div></div>
            <div style="display:flex;gap:0.5rem;align-items:center">
              <span class="badge">${p.role}</span>
              ${p.role !== 'superadmin' ? `<button class="btn btn-secondary btn-sm" data-grant="${p.email}">+1 mes</button>` : ''}
            </div>
          </div>
        `).join('') : '<p class="empty">Sin usuarios aún.</p>'}
      </div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h3>Gestión de contenido</h3>
      <p>Para agregar lecciones, ejercicios o ensayos, edita los archivos JSON en <code>data/{prueba}/</code> del repositorio y publica.</p>
      <ul style="margin:0.75rem 0 0 1.25rem">
        <li><code>data/m1/content.json</code> — lecciones M1</li>
        <li><code>data/m2/content.json</code> — lecciones M2</li>
        <li><code>data/*/exercises.json</code> — banco de preguntas</li>
        <li><code>assets/m2/</code> — PDFs biblioteca</li>
      </ul>
      <p style="margin-top:0.75rem"><a href="https://github.com/RaimundoIbieta/estudio-paes-m2" target="_blank" rel="noopener" class="btn btn-secondary">Abrir repositorio</a></p>
    </section>

    <section class="card" style="margin-top:1rem">
      <h3>Pendiente de integración</h3>
      <ul style="margin-left:1.25rem">
        <li>Pago real (Mercado Pago / Webpay)</li>
        <li>Editor visual de contenido en el panel</li>
        <li>Bancos completos: 65 preguntas M1, 55 M2</li>
      </ul>
    </section>
  `;

  container.querySelectorAll('[data-grant]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await grantSubscription(btn.dataset.grant, 1);
        btn.textContent = '✓';
      } catch (ex) {
        alert(ex.message);
      }
    });
  });
}
