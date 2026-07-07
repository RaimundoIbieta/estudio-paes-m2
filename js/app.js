import { parseRoute, onRouteChange } from './router.js';
import { renderHome } from './pages/home.js';
import { renderContentList, renderLesson } from './pages/content.js';
import { renderExercises } from './pages/exercises.js';
import { renderEssays } from './pages/essays.js';
import { renderProgress } from './pages/progress.js';

const view = document.getElementById('view');
const nav = document.getElementById('main-nav');
const navToggle = document.getElementById('nav-toggle');

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
        renderHome(view);
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
      default:
        renderHome(view);
    }
  } catch (err) {
    view.innerHTML = `
      <div class="card">
        <h3>Error al cargar</h3>
        <p>Si abres el archivo directamente, usa un servidor local o sube la app a GitHub Pages.</p>
        <p style="color:var(--muted);font-size:0.85rem">${err.message}</p>
      </div>
    `;
  }
}

onRouteChange(render);
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
