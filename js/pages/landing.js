import { APP_CONFIG } from '../config.js';

export function renderLanding(container) {
  const price = APP_CONFIG.pricing.label;
  container.innerHTML = `
    <section class="landing-hero">
      <div class="landing-copy">
        <span class="landing-badge">Preparación PAES seria</span>
        <h1>${APP_CONFIG.brandName}</h1>
        <p class="landing-lead">${APP_CONFIG.tagline}. Metodología con ensayos diagnósticos, mini ensayos por unidad y seguimiento real de tu avance.</p>
        <div class="landing-cta">
          <a href="#/registro" class="btn btn-primary btn-lg" data-route>Comenzar ahora</a>
          <a href="#/login" class="btn btn-secondary btn-lg" data-route>Ya tengo cuenta</a>
        </div>
        <p class="landing-price">Desde <strong>${price}</strong> · cancela cuando quieras</p>
      </div>
      <div class="landing-panel card">
        <h3>Cómo funciona</h3>
        <ol class="landing-steps">
          <li><strong>1. Ensayo diagnóstico</strong> — mides tu punto de partida antes de estudiar.</li>
          <li><strong>2. Unidades guiadas</strong> — teoría, ejercicios y diagramas claros.</li>
          <li><strong>3. Mini ensayo (30 preguntas)</strong> — verificas cada unidad estudiada.</li>
          <li><strong>4. Ensayo de progreso</strong> — cada 2 unidades, evaluación obligatoria.</li>
        </ol>
      </div>
    </section>

    <section class="landing-grid">
      <article class="card">
        <h3>M1 · M2 · CL · HCS · Ciencias</h3>
        <p>Cinco pruebas PAES con ruta de estudio estructurada, no solo PDFs sueltos.</p>
      </article>
      <article class="card">
        <h3>Progreso visible</h3>
        <p>Panel con tu ruta, puntajes y lo que debes hacer a continuación.</p>
      </article>
      <article class="card">
        <h3>Material actualizable</h3>
        <p>Contenido en expansión continua. Biblioteca PDF para M2 incluida.</p>
      </article>
    </section>
  `;
}
