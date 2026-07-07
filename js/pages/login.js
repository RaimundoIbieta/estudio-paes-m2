import { signIn, signUp, signOut, isAuthEnabled, getUser, isSuperAdmin } from '../auth.js';

export function renderAuthButton(container) {
  const user = getUser();
  if (!isAuthEnabled()) {
    container.innerHTML = `<span class="auth-hint">Modo invitado</span>`;
    return;
  }
  if (user) {
    container.innerHTML = `
      <span class="auth-user">${user.email?.split('@')[0]}</span>
      ${isSuperAdmin() ? '<a href="#/admin" class="auth-link" data-route>Admin</a>' : ''}
      <button class="btn-auth" id="btn-logout">Salir</button>
    `;
    container.querySelector('#btn-logout')?.addEventListener('click', () => signOut());
  } else {
    container.innerHTML = `<a href="#/login" class="auth-link" data-route>Ingresar</a>`;
  }
}

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-card">
      <h1 class="page-title">Ingresar</h1>
      <p class="page-sub">Crea tu cuenta gratis. Tu progreso se guarda en este dispositivo.</p>
      <form id="login-form" class="auth-form">
        <label>Correo<input type="email" name="email" required autocomplete="email"/></label>
        <label>Contraseña<input type="password" name="password" required minlength="6" autocomplete="current-password"/></label>
        <div id="auth-error" class="auth-error"></div>
        <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
        <button type="button" class="btn btn-secondary btn-block" id="btn-register">Crear cuenta nueva</button>
      </form>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const err = container.querySelector('#auth-error');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    try {
      await signIn(fd.get('email'), fd.get('password'));
      location.hash = '#/';
    } catch (ex) {
      err.textContent = ex.message;
    }
  });

  container.querySelector('#btn-register').addEventListener('click', async () => {
    err.textContent = '';
    const fd = new FormData(form);
    try {
      await signUp(fd.get('email'), fd.get('password'), fd.get('email').split('@')[0]);
      err.textContent = 'Cuenta creada. Ya puedes ingresar con tu correo y contraseña.';
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
}
