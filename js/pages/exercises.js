import { recordExercise } from '../storage.js';
import { getCurrentTest, fetchTestData } from '../test-context.js';

export async function loadExercises() {
  return fetchTestData(null, 'exercises');
}

export async function renderExercises(container, filterArea = 'all') {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }
  const exercises = await loadExercises();
  const areas = [...new Set(exercises.map(e => e.area))];

  container.innerHTML = `
    <h1 class="page-title">Ejercicios</h1>
    <p class="page-sub">Selecciona un área o practica con preguntas aleatorias.</p>
    <div class="filters" id="ex-filters">
      <button class="filter-btn ${filterArea === 'all' ? 'active' : ''}" data-area="all">Todos</button>
      ${areas.map(a => `<button class="filter-btn ${filterArea === a ? 'active' : ''}" data-area="${a}">${a}</button>`).join('')}
    </div>
    <div class="grid" id="ex-grid">
      ${renderExerciseCards(exercises, filterArea)}
    </div>
    <div style="margin-top:1rem">
      <button class="btn btn-primary" id="random-quiz">Práctica aleatoria (5 preguntas)</button>
    </div>
  `;

  container.querySelector('#ex-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-area]');
    if (!btn) return;
    renderExercises(container, btn.dataset.area);
  });

  container.querySelector('#ex-grid').addEventListener('click', e => {
    const card = e.target.closest('[data-ex-id]');
    if (card) startQuiz(container, [card.dataset.exId]);
  });

  container.querySelector('#random-quiz').addEventListener('click', async () => {
    const all = await loadExercises();
    const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 5);
    startQuiz(container, shuffled.map(q => q.id), true);
  });
}

function renderExerciseCards(exercises, area) {
  const filtered = area === 'all' ? exercises : exercises.filter(e => e.area === area);
  return filtered.map(ex => `
    <article class="card" style="cursor:pointer" data-ex-id="${ex.id}">
      <span class="badge">${ex.area} · ${ex.difficulty}</span>
      <p style="margin:0.6rem 0 0">${ex.question}</p>
      <button class="btn btn-secondary btn-block" style="margin-top:0.75rem">Responder</button>
    </article>
  `).join('');
}

export async function startQuiz(container, ids, isSession = false) {
  const all = await loadExercises();
  const questions = ids.map(id => all.find(q => q.id === id)).filter(Boolean);
  if (!questions.length) return;

  let index = 0;
  let correct = 0;
  let selected = null;
  let answered = false;

  function render() {
    const q = questions[index];
    const pct = ((index) / questions.length) * 100;

    container.innerHTML = `
      <a href="#/ejercicios" class="back-link" data-route>← Volver</a>
      <div class="quiz-card">
        <div class="quiz-progress"><div style="width:${pct}%"></div></div>
        <div class="topic-meta">Pregunta ${index + 1} de ${questions.length} · ${q.area} · ${q.difficulty}</div>
        <p class="question-text">${q.question}</p>
        <div class="options" id="options">
          ${q.options.map((opt, i) => `
            <button class="option" data-i="${i}">${String.fromCharCode(65 + i)}. ${opt}</button>
          `).join('')}
        </div>
        <div id="feedback"></div>
        <div class="quiz-actions">
          <button class="btn btn-primary" id="check-btn" disabled>Comprobar</button>
          <button class="btn btn-secondary" id="next-btn" style="display:none">Siguiente</button>
        </div>
      </div>
    `;

    selected = null;
    answered = false;

    const optionsEl = container.querySelector('#options');
    const checkBtn = container.querySelector('#check-btn');
    const nextBtn = container.querySelector('#next-btn');
    const feedbackEl = container.querySelector('#feedback');

    optionsEl.addEventListener('click', e => {
      const btn = e.target.closest('.option');
      if (!btn || answered) return;
      optionsEl.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
      selected = +btn.dataset.i;
      checkBtn.disabled = false;
    });

    checkBtn.addEventListener('click', () => {
      if (selected === null || answered) return;
      answered = true;
      const isCorrect = selected === q.answer;
      if (isCorrect) correct += 1;
      if (!isSession) recordExercise(q.id, isCorrect);

      optionsEl.querySelectorAll('.option').forEach((o, i) => {
        if (i === q.answer) o.classList.add('correct');
        else if (i === selected) o.classList.add('wrong');
        o.disabled = true;
      });

      feedbackEl.innerHTML = `
        <div class="feedback ${isCorrect ? 'ok' : 'bad'}">
          <strong>${isCorrect ? '¡Correcto!' : 'Incorrecto'}</strong>
          <p>${q.explanation}</p>
        </div>
      `;
      checkBtn.style.display = 'none';
      nextBtn.style.display = 'inline-flex';
      nextBtn.textContent = index < questions.length - 1 ? 'Siguiente' : 'Ver resultado';
    });

    nextBtn.addEventListener('click', () => {
      if (index < questions.length - 1) {
        index += 1;
        render();
      } else {
        showResult(container, correct, questions.length, isSession);
      }
    });
  }

  render();
}

function showResult(container, correct, total, isSession) {
  const pct = Math.round((correct / total) * 100);
  container.innerHTML = `
    <div class="quiz-card" style="text-align:center">
      <h2>Resultado</h2>
      <div class="results-grid">
        <div class="stat-box"><strong>${correct}/${total}</strong><span>Correctas</span></div>
        <div class="stat-box"><strong>${pct}%</strong><span>Precisión</span></div>
      </div>
      <p style="margin:1rem 0;color:var(--muted)">
        ${pct >= 80 ? '¡Excelente trabajo!' : pct >= 60 ? 'Buen avance, sigue practicando.' : 'Repasa el contenido y vuelve a intentar.'}
      </p>
      <div class="quiz-actions" style="justify-content:center">
        <a href="#/ejercicios" class="btn btn-primary" data-route>Más ejercicios</a>
        <a href="#/contenido" class="btn btn-secondary" data-route>Repasar teoría</a>
      </div>
    </div>
  `;
}

export { startQuiz as runQuizSession };
