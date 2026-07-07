/**
 * Quiz de practica con feedback inmediato (ejercicios de unidad y banco general).
 * Los ensayos cronometrados usan essay-engine.js (sin feedback hasta el final).
 */
import { recordExercise } from './storage.js';

export function runPracticeQuiz(container, questions, {
  returnHash = '#/ejercicios',
  title = 'Practica',
  recordStats = true,
} = {}) {
  if (!questions.length) {
    container.innerHTML = `<div class="card"><p>No hay ejercicios disponibles.</p>
      <a href="${returnHash}" class="btn btn-secondary" data-route>Volver</a></div>`;
    return;
  }

  let index = 0;
  let correct = 0;
  let selected = null;
  let answered = false;

  function render() {
    const q = questions[index];
    const pct = (index / questions.length) * 100;

    container.innerHTML = `
      <a href="${returnHash}" class="back-link" data-route>? Volver</a>
      <div class="quiz-card practice-card">
        <div class="practice-badge">Practica · feedback inmediato</div>
        <div class="quiz-progress"><div style="width:${pct}%"></div></div>
        <div class="topic-meta">${title} · Pregunta ${index + 1} de ${questions.length} · ${q.area} · ${q.difficulty}</div>
        <div class="question-text">${q.question}</div>
        <div class="options" id="options">
          ${q.options.map((opt, i) => `
            <button type="button" class="option" data-i="${i}">${String.fromCharCode(65 + i)}. ${opt}</button>
          `).join('')}
        </div>
        <div id="feedback"></div>
        <div class="quiz-actions">
          <button type="button" class="btn btn-primary" id="check-btn" disabled>Comprobar</button>
          <button type="button" class="btn btn-secondary" id="next-btn" style="display:none">
            ${index < questions.length - 1 ? 'Siguiente' : 'Ver resultado'}
          </button>
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
      if (recordStats && q.id) recordExercise(q.id, isCorrect);

      optionsEl.querySelectorAll('.option').forEach((o, i) => {
        o.disabled = true;
        if (i === q.answer) o.classList.add('correct');
        else if (i === selected) o.classList.add('wrong');
      });

      feedbackEl.innerHTML = `
        <div class="feedback ${isCorrect ? 'ok' : 'bad'}">
          <strong>${isCorrect ? 'Correcto' : 'Incorrecto'}</strong>
          <p>${q.explanation || ''}</p>
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
        showPracticeResult(container, { correct, total: questions.length, returnHash });
      }
    });
  }

  render();
}

function showPracticeResult(container, { correct, total, returnHash }) {
  const pct = Math.round((correct / total) * 100);
  container.innerHTML = `
    <div class="quiz-card" style="text-align:center">
      <h2>Practica terminada</h2>
      <div class="results-grid">
        <div class="stat-box"><strong>${correct}/${total}</strong><span>Correctas</span></div>
        <div class="stat-box"><strong>${pct}%</strong><span>Precisión</span></div>
      </div>
      <div class="quiz-actions" style="justify-content:center;margin-top:1rem">
        <a href="${returnHash}" class="btn btn-primary" data-route>Volver</a>
      </div>
    </div>
  `;
}
