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

const view = document.getElementById('view');
const nav = document.getElementById('main-nav');
const navToggle = document.getElementById('nav-toggle');
const authSlot = document.getElementById('auth-slot');

navToggle?.addEventListener('click', () => nav.classList.toggle('open'));

document.addEventListener('click', e => {
  if (e.target.closest('[data-route]')) nav.classList.remove('open');
});

async function render() {
  const { path, params } = parseRoute();

  nav.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href').slice(1);
    const current = `#/${path === 'home' ? '' : path}${params.length ? '/' + params.join('/') : ''}`;
    a.classList.toggle('active', a.getAttribute('href') === current || (path === 'home' && a.getAttribute('href') === '#/'));
  });

  view.innerHTML = '<p class="empty">Cargando…</p>';

  try {
    switch (path) {
      case 'home':
        await renderHome(view);
        break;
      case 'pruebas':
        await renderSelectTest(view);
        break;
      case 'login':
        renderLogin(view);
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
      case 'progreso':
        await renderProgress(view);
        break;
      case 'biblioteca':
        renderBiblioteca(view);
        break;
      default:
        await renderHome(view);
    }
  } catch (err) {
    view.innerHTML = `
      <div class="card">
        <h3>Error al cargar</h3>
        <p>${err.message}</p>
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
