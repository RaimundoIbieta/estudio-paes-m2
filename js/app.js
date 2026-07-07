import { parseRoute, onRouteChange } from './router.js';
import { initAuth } from './auth.js';
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
import { startPathEssay } from './essay-runner.js';
import { getAppShellMode, getRedirectForGuest } from './guards.js';
import { getUser } from './auth.js';

const view = document.getElementById('view');
const nav = document.getElementById('main-nav');
const topbar = document.getElementById('topbar');
const footer = document.getElementById('footer');
const navToggle = document.getElementById('nav-toggle');
const authSlot = document.getElementById('auth-slot');

navToggle?.addEventListener('click', () => nav.classList.toggle('open'));

document.addEventListener('click', e => {
  if (e.target.closest('[data-route]')) nav.classList.remove('open');
});

function setShell(path) {
  const mode = getAppShellMode(path);
  const isPublic = mode === 'public';
  topbar?.classList.toggle('topbar-public', isPublic);
  nav?.classList.toggle('hidden', isPublic || !getUser());
  footer?.classList.toggle('hidden', false);
}

async function render() {
  const { path, params } = parseRoute();

  const redirect = getRedirectForGuest(path === 'home' && !getUser() ? 'landing' : path);
  if (redirect && `#${location.hash.slice(1)}` !== redirect) {
    const current = location.hash || '#/';
    if (path !== 'landing' && path !== 'home' && !['login', 'registro', 'suscripcion'].includes(path)) {
      location.hash = redirect;
      return;
    }
  }

  const effectivePath = (path === 'home' && !getUser()) ? 'landing' : path;
  setShell(effectivePath === 'landing' ? 'landing' : path);

  nav?.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    const active = href === `#/${path === 'app' ? 'app' : path}` ||
      (path === 'home' && href === '#/app') ||
      (path === 'app' && href === '#/app');
    a.classList.toggle('active', active);
  });

  view.innerHTML = '<p class="empty">Cargando…</p>';

  try {
    switch (path) {
      case 'home':
      case 'landing':
        if (getUser()) location.hash = '#/app';
        else renderLanding(view);
        break;
      case 'app':
        await renderHome(view);
        break;
      case 'pruebas':
        await renderSelectTest(view);
        break;
      case 'login':
        renderLogin(view, 'login');
        break;
      case 'registro':
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
        renderBiblioteca(view);
        break;
      default:
        if (getUser()) location.hash = '#/app';
        else renderLanding(view);
    }
  } catch (err) {
    view.innerHTML = `
      <div class="card">
        <h3>Error al cargar</h3>
        <p>${err.message}</p>
        <a href="#/" class="btn btn-secondary" data-route>Reintentar</a>
      </div>
    `;
  }
}

initAuth(() => renderAuthButton(authSlot));
onRouteChange(render);
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
