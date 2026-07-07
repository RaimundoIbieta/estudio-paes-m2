import { recordEssay } from '../storage.js';
import { getCurrentTest, fetchTestData, loadTests } from '../test-context.js';

export async function loadEssays() {
  return fetchTestData(null, 'essays');
}

export async function renderEssays(container) {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const essays = await loadEssays();

  container.innerHTML = `
    <h1 class="page-title">Ensayos — ${test?.short || ''}</h1>
    <p class="page-sub">Simulacros con cronómetro. Intenta responder todas las preguntas antes de que termine el tiempo.</p>
    <div class="grid">
      ${essays.map(e => `
        <article class="card">
          <h3>${e.title}</h3>
          <p>${e.description}</p>
          <div class="topic-meta">${e.questionIds.length} preguntas · ${e.durationMinutes} min sugeridos</div>
          <button class="btn btn-primary btn-block" style="margin-top:0.75rem" data-essay="${e.id}">Comenzar ensayo</button>
        </article>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('[data-essay]').forEach(btn => {
    btn.addEventListener('click', () => startEssay(container, btn.dataset.essay));
  });
}

async function startEssay(container, essayId) {
  const essays = await loadEssays();
  const essay = essays.find(e => e.id === essayId);
  if (!essay) return;

  let secondsLeft = essay.durationMinutes * 60;
  let timerId = null;
  let quizStarted = false;

  container.innerHTML = `
    <div class="timer-bar">
      <div>
        <strong>${essay.title}</strong>
        <div class="topic-meta" style="color:rgba(255,255,255,0.8)">Tiempo sugerido: ${essay.durationMinutes} min</div>
      </div>
      <div class="timer" id="timer">${formatTime(secondsLeft)}</div>
    </div>
    <div id="essay-quiz"></div>
    <div class="quiz-actions">
      <button class="btn btn-danger" id="cancel-essay">Cancelar ensayo</button>
    </div>
  `;

  const timerEl = container.querySelector('#timer');
  timerId = setInterval(() => {
    secondsLeft -= 1;
    timerEl.textContent = formatTime(secondsLeft);
    if (secondsLeft <= 60) timerEl.classList.add('danger');
    else if (secondsLeft <= 180) timerEl.classList.add('warning');
    if (secondsLeft <= 0) {
      clearInterval(timerId);
      timerEl.textContent = '¡Tiempo!';
    }
  }, 1000);

  container.querySelector('#cancel-essay').addEventListener('click', () => {
    clearInterval(timerId);
    renderEssays(container);
  });

  const quizEl = container.querySelector('#essay-quiz');
  await runEssayQuiz(quizEl, essay, (correct, total) => {
    clearInterval(timerId);
    const score = Math.round((correct / total) * 100);
    const timeUsed = essay.durationMinutes * 60 - secondsLeft;
    recordEssay({
      essayId: essay.id,
      title: essay.title,
      correct,
      total,
      score,
      timeUsedSeconds: timeUsed,
    });
    showEssayResult(container, essay, correct, total, score, timeUsed);
  });
}

async function runEssayQuiz(container, essay, onComplete) {
  const all = await loadExercises();
  const questions = essay.questionIds.map(id => all.find(q => q.id === id)).filter(Boolean);

  let index = 0;
  let correct = 0;
  let selected = null;
  let answered = false;
  const answers = [];

  function render() {
    const q = questions[index];
    const pct = (index / questions.length) * 100;

    container.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress"><div style="width:${pct}%"></div></div>
        <div class="topic-meta">Pregunta ${index + 1} de ${questions.length}</div>
        <p class="question-text">${q.question}</p>
        <div class="options" id="options">
          ${q.options.map((opt, i) => `<button class="option" data-i="${i}">${String.fromCharCode(65 + i)}. ${opt}</button>`).join('')}
        </div>
        <div id="feedback"></div>
        <div class="quiz-actions">
          <button class="btn btn-primary" id="check-btn" disabled>Confirmar</button>
          <button class="btn btn-secondary" id="next-btn" style="display:none">${index < questions.length - 1 ? 'Siguiente' : 'Finalizar ensayo'}</button>
        </div>
      </div>
    `;

    selected = null;
    answered = false;

    const optionsEl = container.querySelector('#options');
    const checkBtn = container.querySelector('#check-btn');
    const nextBtn = container.querySelector('#next-btn');

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
      answers.push({ id: q.id, correct: isCorrect, selected, answer: q.answer });
      if (isCorrect) correct += 1;

      optionsEl.querySelectorAll('.option').forEach((o, i) => {
        if (i === q.answer) o.classList.add('correct');
        else if (i === selected) o.classList.add('wrong');
      });

      container.querySelector('#feedback').innerHTML = `
        <div class="feedback ${isCorrect ? 'ok' : 'bad'}">
          <strong>${isCorrect ? 'Correcto' : 'Incorrecto'}</strong> — ${q.explanation}
        </div>
      `;
      checkBtn.style.display = 'none';
      nextBtn.style.display = 'inline-flex';
    });

    nextBtn.addEventListener('click', () => {
      if (index < questions.length - 1) {
        index += 1;
        render();
      } else {
        onComplete(correct, questions.length);
      }
    });
  }

  render();
}

function showEssayResult(container, essay, correct, total, score, timeUsed) {
  container.innerHTML = `
    <div class="quiz-card">
      <h2>Ensayo finalizado</h2>
      <p class="page-sub">${essay.title}</p>
      <div class="results-grid">
        <div class="stat-box"><strong>${correct}/${total}</strong><span>Correctas</span></div>
        <div class="stat-box"><strong>${score}%</strong><span>Puntaje</span></div>
        <div class="stat-box"><strong>${formatTime(timeUsed)}</strong><span>Tiempo usado</span></div>
      </div>
      <p style="margin:1rem 0;color:var(--muted)">
        ${score >= 80 ? '¡Muy bien! Sigue con otro ensayo para afianzar.' : 'Repasa los temas donde fallaste y vuelve a intentar.'}
      </p>
      <div class="quiz-actions">
        <a href="#/ensayos" class="btn btn-primary" data-route>Otro ensayo</a>
        <a href="#/progreso" class="btn btn-secondary" data-route>Ver progreso</a>
      </div>
    </div>
  `;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
