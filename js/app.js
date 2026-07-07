import { parseRoute, onRouteChange } from './router.js';
import { initAuth, getUser } from './auth.js';
import { renderAuthButton } from './pages/login.js';
import { renderHome } from './pages/home.js';
import { renderContentList, renderLesson } from './pages/content.js';
import { renderExercises } from './pages/exercises.js';
import { renderEssays } from './pages/essays.js';
import { renderProgress } from './pages/progress.js';
import { renderSelectTest } from './pages/select-test.js';
import { renderLogin } from './pages/login.js';
import { renderAdmin } from './pages/admin.js';
import { renderBiblioteca } from './pages/biblioteca.js';
import { renderLanding } from './pages/landing.js';
import { renderSubscription } from './pages/subscription.js';
import { startPathEssay } from './essay-engine.js';
import { getAppShellMode, getRedirectForGuest, getRedirectIfLoggedIn } from './guards.js';

const view = document.getElementById('view');
const nav = document.getElementById('main-nav');
const topbar = document.getElementById('topbar');
const navToggle = document.getElementById('nav-toggle');
const authSlot = document.getElementById('auth-slot');

let booted = false;

navToggle?.addEventListener('click', () => nav?.classList.toggle('open'));

document.addEventListener('click', e => {
  if (e.target.closest('[data-route]')) nav?.classList.remove('open');
});

function setShell(path) {
  const mode = getAppShellMode(path);
  const isPublic = mode === 'public';
  topbar?.classList.toggle('topbar-public', isPublic);
  nav?.classList.toggle('hidden', isPublic || !getUser());
}

function showError(err) {
  if (!view) return;
  const back = getUser() ? '#/app' : '#/';
  view.innerHTML = `
    <div class="card">
      <h3>Error al cargar la plataforma</h3>
      <p>${err?.message || 'Error desconocido'}</p>
      <a href="${back}" class="btn btn-primary" data-route>Volver al inicio</a>
      <button class="btn btn-secondary" onclick="location.reload()" style="margin-left:0.5rem">Recargar</button>
    </div>`;
}

async function render() {
  if (!view) return;

  try {
    const { path, params } = parseRoute();
    const redirect = getRedirectForGuest(path) || getRedirectIfLoggedIn(path);

    if (redirect) {
      const target = redirect.replace(/^#/, '');
      const current = (location.hash || '#/').replace(/^#/, '');
      if (current !== target) {
        location.hash = redirect;
        return;
      }
    }

    setShell(path);
    view.innerHTML = '<p class="empty">Cargando…</p>';

    switch (path) {
      case 'home':
        if (getUser()) {
          location.hash = '#/app';
          return;
        }
        renderLanding(view);
        break;
      case 'app':
        await renderHome(view);
        break;
      case 'pruebas':
        await renderSelectTest(view);
        break;
      case 'login':
        if (getUser()) { location.hash = '#/app'; return; }
        renderLogin(view, 'login');
        break;
      case 'registro':
        if (getUser()) { location.hash = '#/app'; return; }
        renderLogin(view, 'registro');
        break;
      case 'suscripcion':
        renderSubscription(view);
        break;
      case 'admin':
        await renderAdmin(view);
        break;
      case 'contenido':
        if (params[0]) await renderLesson(view, params[0]);
        else await renderContentList(view);
        break;
      case 'ejercicios':
        await renderExercises(view);
        break;
      case 'ensayos':
        await renderEssays(view);
        break;
      case 'ensayo':
        if (params[0] === 'diagnostico') await startPathEssay(view, 'diagnostic');
        else if (params[0] === 'progreso') await startPathEssay(view, 'checkpoint');
        else if (params[0] === 'unidad' && params[1]) await startPathEssay(view, 'unit', params[1]);
        else await renderEssays(view);
        break;
      case 'progreso':
        await renderProgress(view);
        break;
      case 'biblioteca':
        await renderBiblioteca(view);
        break;
      default:
        if (getUser()) location.hash = '#/app';
        else renderLanding(view);
    }
  } catch (err) {
    console.error(err);
    showError(err);
  }
}

function boot() {
  if (booted) return;
  booted = true;

  onRouteChange(render);
  render();

  initAuth(() => {
    renderAuthButton(authSlot);
    render();
  }).catch(() => render());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {});
  }
}

boot();
