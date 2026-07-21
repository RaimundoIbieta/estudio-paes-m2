import { signIn, signUp, signOut, getUser, isSuperAdmin, hasActiveSubscription, isCloudAuthConfigured } from '../auth.js';
import { APP_CONFIG } from '../config.js';

export function renderAuthButton(container) {
  const user = getUser();
  if (user) {
    const sub = hasActiveSubscription() ? '' : ' · <span class="auth-warn">Sin plan</span>';
    container.innerHTML = `
      <span class="auth-user">${user.email?.split('@')[0]}${sub}</span>
      ${isSuperAdmin() ? '<a href="#/admin" class="auth-link" data-route>Admin</a>' : ''}
      <button class="btn-auth" id="btn-logout">Salir</button>
    `;
    container.querySelector('#btn-logout')?.addEventListener('click', () => signOut().then(() => { location.hash = '#/'; }));
  } else {
    container.innerHTML = `
      <a href="#/login" class="btn-auth btn-auth-primary" data-route>Ingresar</a>
    `;
  }
}

export function renderLogin(container, mode = 'login') {
  const isRegister = mode === 'registro';
  const cloud = isCloudAuthConfigured();
  container.innerHTML = `
    <div class="auth-card">
      <h1 class="page-title">${isRegister ? 'Crear cuenta' : 'Ingresar'}</h1>
      <p class="page-sub">${isRegister ? `Regístrate y activa tu plan desde ${APP_CONFIG.pricing.label}.` : 'Accede a tu ruta de estudio PAES.'}</p>
      ${cloud ? '' : `
      <p class="auth-error" style="min-height:0;margin-bottom:0.85rem">
        Modo local: la cuenta solo existe en <strong>este navegador</strong>. Si el admin te creó la cuenta en otro dispositivo, no podrás entrar hasta configurar Supabase.
      </p>`}
      <form id="login-form" class="auth-form">
        <label>Correo<input type="email" name="email" required autocomplete="email" placeholder="tu@correo.cl"/></label>
        <label>Contraseña<input type="password" name="password" required minlength="6" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="Mínimo 6 caracteres"/></label>
        <div id="auth-error" class="auth-error"></div>
        <button type="submit" class="btn btn-primary btn-block">${isRegister ? 'Crear cuenta' : 'Ingresar'}</button>
      </form>
      <p style="margin-top:1rem;text-align:center;font-size:0.9rem">
        ${isRegister
          ? '¿Ya tienes cuenta? <a href="#/login" data-route>Ingresar</a>'
          : '¿No tienes cuenta? <a href="#/registro" data-route>Regístrate</a>'}
      </p>
      <p style="margin-top:0.5rem;text-align:center"><a href="#/" data-route>← Volver al inicio</a></p>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const err = container.querySelector('#auth-error');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    const email = fd.get('email');
    const password = fd.get('password');
    try {
      if (isRegister) {
        await signUp(email, password, email.split('@')[0]);
        location.hash = '#/suscripcion';
      } else {
        await signIn(email, password);
        location.hash = hasActiveSubscription() ? '#/app' : '#/suscripcion';
      }
    } catch (ex) {
      err.textContent = ex.message;
    }
  });
}
