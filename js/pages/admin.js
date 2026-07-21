import {
  isSuperAdmin,
  fetchAllProfiles,
  grantSubscription,
  adminCreateUser,
  adminResetPassword,
  adminDeleteUser,
  isCloudAuthConfigured,
  getAuthBackend,
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
  if (p.disabled) return '<span class="badge">Deshabilitado</span>';
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
  const cloud = isCloudAuthConfigured();
  const [profiles, tests] = await Promise.all([fetchAllProfiles(), loadTests()]);
  const ready = tests.filter(t => t.ready).length;
  const suggestedPass = randomPassword();

  const modeBanner = cloud
    ? `<section class="card" style="margin-top:1rem;border-left:4px solid #15803d">
        <h3>Modo nube (Supabase)</h3>
        <p class="page-sub">Las cuentas creadas aqui funcionan en <strong>cualquier navegador o dispositivo</strong>.</p>
      </section>`
    : `<section class="gate-banner card" style="margin-top:1rem">
        <h3>Modo local (solo este navegador)</h3>
        <p>Hoy las cuentas se guardan en IndexedDB de <strong>este</strong> navegador. Por eso un alumno no puede entrar desde otro computador.</p>
        <p style="margin-top:0.5rem">Para arreglarlo: crea un proyecto gratis en <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>, ejecuta <code>supabase/schema.sql</code>, desactiva Confirm email, y pega <code>supabaseUrl</code> + <code>supabaseAnonKey</code> en <code>js/config.js</code>.</p>
      </section>`;

  container.innerHTML = `
    <h1 class="page-title">Panel superadmin</h1>
    <p class="page-sub">Gestion de usuarios · backend: <strong>${getAuthBackend()}</strong></p>
    ${flash ? `<p class="auth-ok" style="margin:0.5rem 0">${flash}</p>` : ''}
    ${modeBanner}
    <div class="results-grid">
      <div class="stat-box"><strong>${profiles.length}</strong><span>Usuarios</span></div>
      <div class="stat-box"><strong>${ready}/${tests.length}</strong><span>Pruebas activas</span></div>
      <div class="stat-box"><strong>${APP_CONFIG.pricing.label}</strong><span>Plan actual</span></div>
    </div>

    <section class="card" style="margin-top:1rem">
      <h3>Crear usuario</h3>
      <p class="page-sub">Crea una cuenta de alumno sin cambiar tu sesion de admin. Entrega el correo y la contrasena al estudiante.</p>
      <form id="admin-create-user" class="auth-form" style="margin-top:0.75rem">
        <label>Nombre
          <input type="text" name="name" placeholder="Nombre del alumno" autocomplete="off"/>
        </label>
        <label>Correo
          <input type="email" name="email" required placeholder="alumno@correo.cl" autocomplete="off"/>
        </label>
        <label>Contrasena temporal
          <div style="display:flex;gap:0.5rem;align-items:center">
            <input type="text" name="password" required minlength="6" value="${suggestedPass}" autocomplete="off" style="flex:1"/>
            <button type="button" class="btn btn-secondary btn-sm" id="gen-pass">Otra</button>
          </div>
        </label>
        <label>Plan al crear
          <select name="months">
            <option value="0">Sin plan (el alumno activa despues)</option>
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
              ${p.role !== 'superadmin' && !p.disabled ? `
                <button class="btn btn-secondary btn-sm" data-grant="${p.email}">+1 mes</button>
                <button class="btn btn-secondary btn-sm" data-reset="${p.email}">${cloud ? 'Enviar reset' : 'Reset clave'}</button>
                <button class="btn btn-danger btn-sm" data-delete="${p.email}">${cloud ? 'Deshabilitar' : 'Eliminar'}</button>
              ` : ''}
            </div>
          </div>
        `).join('') : '<p class="empty">Sin usuarios aun. Crea el primero arriba.</p>'}
      </div>
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
    const email = String(fd.get('email') || '');
    const password = String(fd.get('password') || '');
    try {
      const created = await adminCreateUser({
        email,
        password,
        name: fd.get('name'),
        months: Number(fd.get('months') || 0),
      });
      const msg = cloud
        ? `Usuario nube creado: <code>${created.email}</code> · clave: <code>${password}</code>${created.monthsGranted ? ` · plan ${created.monthsGranted} mes(es)` : ''}. Ya puede entrar desde cualquier navegador.`
        : `Usuario LOCAL creado: <code>${created.email}</code> · clave: <code>${password}</code>. Solo funciona en ESTE navegador. Para probarlo: cierra sesion e inicia con esas credenciales aqui.`;
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
      if (cloud) {
        if (!confirm(`Enviar correo de restablecimiento a ${btn.dataset.reset}?`)) return;
        try {
          await adminResetPassword(btn.dataset.reset, '');
          await paint(container, `Correo de reset enviado a ${btn.dataset.reset}`);
        } catch (ex) {
          alert(ex.message);
        }
        return;
      }
      const pass = randomPassword();
      if (!confirm(`Resetear contrasena de ${btn.dataset.reset}?\nNueva clave: ${pass}`)) return;
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
      const label = cloud ? 'deshabilitar' : 'eliminar';
      if (!confirm(`Seguro que quieres ${label} a ${btn.dataset.delete}?`)) return;
      try {
        await adminDeleteUser(btn.dataset.delete);
        await paint(container, `Usuario ${label}: ${btn.dataset.delete}`);
      } catch (ex) {
        alert(ex.message);
      }
    });
  });
}
