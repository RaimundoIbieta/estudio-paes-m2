import { getCurrentTest } from './test-context.js';
import { recordEssay } from './storage.js';

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export async function runTimedEssay(container, {
  title,
  description,
  questions,
  durationMinutes,
  testId,
  essayType,
  lessonId = null,
  onComplete,
}) {
  if (!questions.length) {
    container.innerHTML = `<div class="card"><h3>Sin preguntas disponibles</h3><p>El banco de preguntas se está ampliando. Intenta más tarde.</p></div>`;
    return;
  }

  let secondsLeft = durationMinutes * 60;
  let timerId = null;

  container.innerHTML = `
    <div class="timer-bar">
      <div>
        <strong>${title}</strong>
        <div class="topic-meta" style="color:rgba(255,255,255,0.8)">${description}</div>
      </div>
      <div class="timer" id="timer">${formatTime(secondsLeft)}</div>
    </div>
    <div id="essay-quiz"></div>
    <div class="quiz-actions">
      <button class="btn btn-danger" id="cancel-essay">Salir del ensayo</button>
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

  const cancel = () => {
    clearInterval(timerId);
    location.hash = '#/progreso';
  };
  container.querySelector('#cancel-essay').addEventListener('click', cancel);

  const quizEl = container.querySelector('#essay-quiz');
  await runQuiz(quizEl, questions, async (correct, total) => {
    clearInterval(timerId);
    const score = Math.round((correct / total) * 100);
    const timeUsed = durationMinutes * 60 - secondsLeft;

    recordEssay({
      essayId: `${essayType}-${Date.now()}`,
      title,
      testId,
      essayType,
      lessonId,
      correct,
      total,
      score,
      timeUsedSeconds: timeUsed,
    });

    if (onComplete) await onComplete({ correct, total, score, timeUsed });

    showResult(container, { title, correct, total, score, timeUsed });
  });
}

async function runQuiz(container, questions, onComplete) {
  let index = 0;
  let correct = 0;
  let selected = null;
  let answered = false;

  function render() {
    const q = questions[index];
    const pct = (index / questions.length) * 100;

    container.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-progress"><div style="width:${pct}%"></div></div>
        <div class="topic-meta">Pregunta ${index + 1} de ${questions.length} · ${q.area || ''}</div>
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
      if (isCorrect) correct += 1;

      optionsEl.querySelectorAll('.option').forEach((o, i) => {
        if (i === q.answer) o.classList.add('correct');
        else if (i === selected) o.classList.add('wrong');
      });

      container.querySelector('#feedback').innerHTML = `
        <div class="feedback ${isCorrect ? 'ok' : 'bad'}">
          <strong>${isCorrect ? 'Correcto' : 'Incorrecto'}</strong> — ${q.explanation || ''}
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

function showResult(container, { title, correct, total, score, timeUsed }) {
  container.innerHTML = `
    <div class="quiz-card">
      <h2>Ensayo finalizado</h2>
      <p class="page-sub">${title}</p>
      <div class="results-grid">
        <div class="stat-box"><strong>${correct}/${total}</strong><span>Correctas</span></div>
        <div class="stat-box"><strong>${score}%</strong><span>Puntaje</span></div>
        <div class="stat-box"><strong>${formatTime(timeUsed)}</strong><span>Tiempo usado</span></div>
      </div>
      <p style="margin:1rem 0;color:var(--muted)">
        ${score >= 80 ? '¡Excelente! Sigue con la siguiente unidad.' : score >= 60 ? 'Buen trabajo. Repasa los errores antes de continuar.' : 'Repasa la unidad y vuelve a intentar.'}
      </p>
      <div class="quiz-actions">
        <a href="#/progreso" class="btn btn-primary" data-route>Ver mi ruta de estudio</a>
        <a href="#/contenido" class="btn btn-secondary" data-route>Ir al contenido</a>
      </div>
    </div>
  `;
}

export async function startPathEssay(container, type, lessonId = null) {
  const testId = getCurrentTest();
  if (!testId) {
    location.hash = '#/pruebas';
    return;
  }

  const { buildQuestionSet, getEssayMeta, recordDiagnostic, recordUnitEssay, recordCheckpoint } = await import('./learning-path.js');
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const meta = getEssayMeta(type, test);
  const targetCount = type === 'unit' ? meta.count : Math.min(meta.count, meta.count);
  const questions = await buildQuestionSet(testId, { type, lessonId, count: targetCount });

  await runTimedEssay(container, {
    ...meta,
    questions,
    testId,
    essayType: type,
    lessonId,
    onComplete: ({ score }) => {
      if (type === 'diagnostic') recordDiagnostic(testId, score);
      else if (type === 'unit') recordUnitEssay(testId, lessonId, score);
      else if (type === 'checkpoint') recordCheckpoint(testId, score);
    },
  });
}
