import {
  isSuperAdmin,
  fetchAllProfiles,
  grantSubscription,
  adminCreateUser,
  adminResetPassword,
  adminDeleteUser,
} from '../auth.js';
import { loadTests } from '../test-context.js';
import { APP_CONFIG } from '../config.js';

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out;
}

function subBadge(p) {
  if (p.role === 'superadmin') return '<span class="badge">Ilimitado</span>';
  if (p.subscriptionActive) {
    const d = p.subscriptionUntil ? new Date(p.subscriptionUntil).toLocaleDateString('es-CL') : '';
    return `<span class="badge">Plan hasta ${d}</span>`;
  }
  return '<span class="badge">Sin plan</span>';
}

export async function renderAdmin(container) {
  if (!isSuperAdmin()) {
    container.innerHTML = `
      <div class="card"><h2>Acceso restringido</h2>
      <p>Solo el superadministrador (${APP_CONFIG.superadminEmail}) puede ver este panel.</p>
      <a href="#/app" class="btn btn-secondary" data-route>Volver</a></div>`;
    return;
  }

  await paint(container);
}

async function paint(container, flash = '') {
  const [profiles, tests] = await Promise.all([fetchAllProfiles(), loadTests()]);
  const ready = tests.filter(t => t.ready).length;
  const suggestedPass = randomPassword();

  container.innerHTML = `
    <h1 class="page-title">Panel superadmin</h1>
    <p class="page-sub">Gestión de usuarios, suscripciones y contenido de la plataforma.</p>
    ${flash ? `<p class="auth-ok" style="margin:0.5rem 0">${flash}</p>` : ''}
    <div class="results-grid">
      <div class="stat-box"><strong>${profiles.length}</strong><span>Usuarios</span></div>
      <div class="stat-box"><strong>${ready}/${tests.length}</strong><span>Pruebas activas</span></div>
      <div class="stat-box"><strong>${APP_CONFIG.pricing.label}</strong><span>Plan actual</span></div>
    </div>

    <section class="card" style="margin-top:1rem">
      <h3>Crear usuario</h3>
      <p class="page-sub">Crea una cuenta de alumno sin cambiar tu sesión de admin. Entrega el correo y la contraseña al estudiante.</p>
      <form id="admin-create-user" class="auth-form" style="margin-top:0.75rem">
        <label>Nombre
          <input type="text" name="name" placeholder="Nombre del alumno" autocomplete="off"/>
        </label>
        <label>Correo
          <input type="email" name="email" required placeholder="alumno@correo.cl" autocomplete="off"/>
        </label>
        <label>Contraseña temporal
          <div style="display:flex;gap:0.5rem;align-items:center">
            <input type="text" name="password" required minlength="6" value="${suggestedPass}" autocomplete="off" style="flex:1"/>
            <button type="button" class="btn btn-secondary btn-sm" id="gen-pass">Otra</button>
          </div>
        </label>
        <label>Plan al crear
          <select name="months">
            <option value="0">Sin plan (el alumno activa después)</option>
            <option value="1" selected>1 mes incluido</option>
            <option value="3">3 meses incluidos</option>
            <option value="6">6 meses incluidos</option>
            <option value="12">12 meses incluidos</option>
          </select>
        </label>
        <div id="create-error" class="auth-error"></div>
        <button type="submit" class="btn btn-primary">Crear usuario</button>
      </form>
    </section>

    <section class="card" style="margin-top:1rem">
      <h3>Usuarios registrados</h3>
      <div class="topic-list">
        ${profiles.length ? profiles.map(p => `
          <div class="topic-item" style="cursor:default;flex-wrap:wrap;gap:0.5rem">
            <div style="flex:1;min-width:12rem">
              <strong>${p.name || p.email}</strong>
              <div class="topic-meta">${p.email} · ${p.role} · ${p.created_at ? new Date(p.created_at).toLocaleDateString('es-CL') : '—'}</div>
            </div>
            <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap">
              ${subBadge(p)}
              ${p.role !== 'superadmin' ? `
                <button class="btn btn-secondary btn-sm" data-grant="${p.email}">+1 mes</button>
                <button class="btn btn-secondary btn-sm" data-reset="${p.email}">Reset clave</button>
                <button class="btn btn-danger btn-sm" data-delete="${p.email}">Eliminar</button>
              ` : ''}
            </div>
          </div>
        `).join('') : '<p class="empty">Sin usuarios aún. Crea el primero arriba.</p>'}
      </div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h3>Gestión de contenido</h3>
      <p>Para agregar lecciones, ejercicios o ensayos, edita los archivos JSON en <code>data/{prueba}/</code> del repositorio y publica.</p>
      <p style="margin-top:0.75rem"><a href="https://github.com/RaimundoIbieta/estudio-paes-m2" target="_blank" rel="noopener" class="btn btn-secondary">Abrir repositorio</a></p>
    </section>
  `;

  const form = container.querySelector('#admin-create-user');
  const err = container.querySelector('#create-error');
  const passInput = form.querySelector('[name="password"]');

  container.querySelector('#gen-pass')?.addEventListener('click', () => {
    passInput.value = randomPassword();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    try {
      const created = await adminCreateUser({
        email: fd.get('email'),
        password: fd.get('password'),
        name: fd.get('name'),
        months: Number(fd.get('months') || 0),
      });
      const pass = String(fd.get('password'));
      const msg = `Usuario creado: ${created.email}. Contraseña: ${pass}`
        + (created.monthsGranted ? ` · Plan ${created.monthsGranted} mes(es).` : ' · Sin plan.');
      await paint(container, msg);
    } catch (ex) {
      err.textContent = ex.message;
    }
  });

  container.querySelectorAll('[data-grant]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await grantSubscription(btn.dataset.grant, 1);
        await paint(container, `+1 mes otorgado a ${btn.dataset.grant}`);
      } catch (ex) {
        alert(ex.message);
      }
    });
  });

  container.querySelectorAll('[data-reset]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pass = randomPassword();
      if (!confirm(`¿Resetear contraseña de ${btn.dataset.reset}?\nNueva clave: ${pass}`)) return;
      try {
        await adminResetPassword(btn.dataset.reset, pass);
        await paint(container, `Nueva clave para ${btn.dataset.reset}: ${pass}`);
      } catch (ex) {
        alert(ex.message);
      }
    });
  });

  container.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar permanentemente a ${btn.dataset.delete}?`)) return;
      try {
        await adminDeleteUser(btn.dataset.delete);
        await paint(container, `Usuario eliminado: ${btn.dataset.delete}`);
      } catch (ex) {
        alert(ex.message);
      }
    });
  });
}
