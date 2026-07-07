import { getCurrentTest, loadTests } from './test-context.js';
import { recordEssay } from './storage.js';
import { questionFigureHtml, prefersFigurePrimary } from './question-figure.js';

const _build = new URL(import.meta.url).searchParams.get('v') || '24';
const { CACHE_VERSION } = await import(`./config.js?v=${_build}`);
export const ESSAY_ENGINE_BUILD = CACHE_VERSION;

function bankModule() {
  return import(`./question-bank.js?v=${CACHE_VERSION}`);
}

/** Formato HH:MM:SS para el cronometro del ensayo */
export function formatTimeHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
    container.innerHTML = `<div class="card"><h3>Sin preguntas disponibles</h3><p>El banco de preguntas se esta ampliando. Intenta mas tarde.</p></div>`;
    return;
  }

  let secondsLeft = durationMinutes * 60;
  let timerId = null;
  let finishing = false;

  container.innerHTML = `
    <div class="timer-bar">
      <div>
        <strong>${title}</strong>
        <div class="topic-meta" style="color:rgba(255,255,255,0.8)">${description}</div>
      </div>
      <div class="timer-wrap">
        <span class="topic-meta" style="color:rgba(255,255,255,0.7);font-size:0.75rem">Tiempo restante</span>
        <div class="timer" id="timer">${formatTimeHMS(secondsLeft)}</div>
        <span class="topic-meta" style="font-size:0.65rem;opacity:0.6">ensayo v${ESSAY_ENGINE_BUILD}</span>
      </div>
    </div>
    <div id="essay-quiz"></div>
    <div class="quiz-actions essay-footer">
      <button class="btn btn-primary" id="submit-essay">Entregar ensayo</button>
      <button class="btn btn-danger" id="cancel-essay">Salir del ensayo</button>
    </div>
  `;

  const timerEl = container.querySelector('#timer');
  const quizEl = container.querySelector('#essay-quiz');
  const fullTest = essayType === 'diagnostic' || essayType === 'checkpoint';
  const { loadBank, scoreWithClavijero } = await bankModule();
  const bank = await loadBank(testId);

  const finishEssay = async (responses, reason = 'manual') => {
    if (finishing) return;
    finishing = true;
    clearInterval(timerId);

    const correct = responses.filter(r => r.correct).length;
    const total = questions.length;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const timeUsed = durationMinutes * 60 - Math.max(0, secondsLeft);
    const paesScore = bank ? scoreWithClavijero(bank, responses, '2026', { fullTest }) : null;

    recordEssay({
      essayId: `${essayType}-${Date.now()}`,
      title,
      testId,
      essayType,
      lessonId,
      correct,
      total,
      score,
      puntajeP: paesScore?.puntajeP ?? null,
      puntajePaes: paesScore?.puntajePaes ?? null,
      scoredTotal: paesScore?.scoredTotal ?? null,
      timeUsedSeconds: timeUsed,
      finishReason: reason,
    });

    const result = { correct, total, score, timeUsed, paesScore, responses, questions };
    if (onComplete) await onComplete(result);

    showResult(container, { title, essayType, lessonId, ...result, finishReason: reason });
  };

  timerId = setInterval(() => {
    secondsLeft -= 1;
    timerEl.textContent = formatTimeHMS(Math.max(0, secondsLeft));
    if (secondsLeft <= 60) timerEl.classList.add('danger');
    else if (secondsLeft <= 300) timerEl.classList.add('warning');
    if (secondsLeft <= 0) {
      timerEl.textContent = '00:00:00';
      submitExam('timeout');
    }
  }, 1000);

  let submitExam = () => {};

  const cancel = () => {
    if (!confirm('¿Salir del ensayo? Se perdera el avance de esta sesion.')) return;
    clearInterval(timerId);
    location.hash = '#/progreso';
  };
  container.querySelector('#cancel-essay').addEventListener('click', cancel);

  const examApi = runExamQuiz(quizEl, questions, {
    onSubmit: (responses, reason = 'manual') => finishEssay(responses, reason),
  });
  submitExam = (reason) => examApi.forceSubmit(reason);
  container.querySelector('#submit-essay').addEventListener('click', () => examApi.requestSubmit());
}

/**
 * Modo ensayo PAES: sin feedback inmediato, navegacion adelante/atras.
 */
function runExamQuiz(container, questions, { onSubmit }) {
  const answers = new Array(questions.length).fill(null);
  const visited = new Set([0]);
  let index = 0;
  let submitted = false;

  function countAnswered() {
    return answers.filter(a => a !== null).length;
  }

  function dotClass(i) {
    if (i === index) return 'current';
    if (answers[i] !== null) return 'answered';
    if (visited.has(i)) return 'omitted';
    return 'pending';
  }

  function buildResponses() {
    return questions.map((q, i) => {
      const selected = answers[i];
      return {
        id: q.id,
        num: q.num,
        selected,
        correct: selected !== null && selected === q.answer,
        countsForScore: q.countsForScore,
      };
    });
  }

  function render() {
    const q = questions[index];
    const pct = ((index + 1) / questions.length) * 100;
    const omittedCount = [...visited].filter(i => answers[i] === null).length;

    container.innerHTML = `
      <div class="exam-layout">
        <aside class="exam-sidebar">
          <div class="sidebar-title">Preguntas</div>
          <div class="sidebar-legend">
            <span><i class="dot-sample answered"></i> Respondida</span>
            <span><i class="dot-sample omitted"></i> Vista, sin respuesta</span>
            <span><i class="dot-sample pending"></i> No vista</span>
          </div>
          <div class="q-sidebar" id="q-strip">
            ${questions.map((_, i) => `
              <button type="button" class="q-dot ${dotClass(i)}" data-go="${i}" title="Pregunta ${i + 1}">${i + 1}</button>
            `).join('')}
          </div>
        </aside>

        <div class="exam-main quiz-card essay-card">
          <div class="quiz-progress"><div style="width:${pct}%"></div></div>
          <div class="essay-meta">
            <span>Pregunta <strong>${index + 1}</strong> de ${questions.length} · ${q.area || ''}${q.num ? ` · N°${q.num}` : ''}${q.supplement ? ' · complementaria' : ''}</span>
            <span class="essay-answered">${countAnswered()} respondidas · ${omittedCount} omitidas · ${questions.length - visited.size} sin ver</span>
          </div>

          ${prefersFigurePrimary(q) ? questionFigureHtml(q) : `${questionFigureHtml(q)}<div class="question-text">${q.question}</div>`}
          <div class="options" id="options">
            ${q.options.map((opt, i) => `
              <button type="button" class="option ${answers[index] === i ? 'selected' : ''}" data-i="${i}">
                ${String.fromCharCode(65 + i)}. ${opt}
              </button>
            `).join('')}
          </div>

          <div class="quiz-actions essay-nav">
            <button type="button" class="btn btn-secondary" id="prev-btn" ${index === 0 ? 'disabled' : ''}>Anterior</button>
            <button type="button" class="btn btn-primary" id="next-btn">
              ${index < questions.length - 1 ? 'Siguiente' : 'Terminar ensayo'}
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#options').addEventListener('click', e => {
      const btn = e.target.closest('.option');
      if (!btn || submitted) return;
      const i = +btn.dataset.i;
      answers[index] = i;
      container.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
    });

    container.querySelector('#prev-btn').addEventListener('click', () => {
      if (index > 0) {
        index -= 1;
        visited.add(index);
        render();
      }
    });

    container.querySelector('#next-btn').addEventListener('click', () => {
      if (index < questions.length - 1) {
        index += 1;
        visited.add(index);
        render();
      } else {
        showSubmitConfirm(container, questions, answers, () => {
          submitted = true;
          onSubmit(buildResponses(), 'manual');
        });
      }
    });

    container.querySelector('#q-strip').addEventListener('click', e => {
      const dot = e.target.closest('[data-go]');
      if (!dot) return;
      index = +dot.dataset.go;
      visited.add(index);
      render();
    });
  }

  render();

  return {
    requestSubmit() {
      if (submitted) return;
      showSubmitConfirm(container, questions, answers, () => {
        submitted = true;
        onSubmit(buildResponses(), 'manual');
      });
    },
    forceSubmit(reason = 'timeout') {
      if (submitted) return;
      submitted = true;
      onSubmit(buildResponses(), reason);
    },
  };
}

function showSubmitConfirm(container, questions, answers, onConfirm) {
  const missing = answers.filter(a => a === null).length;
  const overlay = document.createElement('div');
  overlay.className = 'essay-overlay';
  overlay.innerHTML = `
    <div class="essay-confirm card">
      <h3>¿Entregar ensayo?</h3>
      <p>${missing
    ? `Tienes <strong>${missing}</strong> pregunta(s) sin responder. Las omitidas se contaran como incorrectas.`
    : 'Has respondido todas las preguntas.'}</p>
      <p class="topic-meta">Podras revisar tus respuestas con el feedback al finalizar.</p>
      <div class="quiz-actions">
        <button type="button" class="btn btn-secondary" id="confirm-back">Seguir revisando</button>
        <button type="button" class="btn btn-primary" id="confirm-submit">Entregar ensayo</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#confirm-back').addEventListener('click', close);
  overlay.querySelector('#confirm-submit').addEventListener('click', () => {
    close();
    onConfirm();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

function showResult(container, { title, essayType, correct, total, score, timeUsed, paesScore, responses, questions, finishReason }) {
  const typeLabels = {
    diagnostic: 'Ensayo diagnostico inicial',
    unit: 'Mini ensayo de unidad',
    checkpoint: 'Ensayo de progreso',
    practice: 'Simulacro',
  };
  const resultTitle = typeLabels[essayType] || 'Ensayo finalizado';
  const scoreLabel = essayType === 'diagnostic'
    ? 'Tu puntaje PAES inicial'
    : essayType === 'unit'
      ? 'Puntaje PAES estimado (mini ensayo)'
      : 'Puntaje PAES';

  const paesBlock = paesScore ? `
        <div class="stat-box stat-highlight"><strong>${paesScore.puntajePaes}</strong><span>${scoreLabel}</span></div>
        <div class="stat-box"><strong>${paesScore.puntajeP}</strong><span>Puntaje P${paesScore.isPartial ? ' (parcial)' : ''}</span></div>
      ` : `
        <div class="stat-box"><strong>${score}%</strong><span>Puntaje</span></div>
      `;

  const reviewHtml = responses?.length ? `
    <details class="essay-review" open>
      <summary>Revisar respuestas (${correct}/${total} correctas)</summary>
      <div class="essay-review-list">
        ${responses.map((r, i) => {
          const q = questions[i];
          const skipped = r.selected === null;
          const ok = r.correct;
          const letter = skipped ? '—' : String.fromCharCode(65 + r.selected);
          const correctLetter = String.fromCharCode(65 + q.answer);
          return `
            <div class="review-item ${skipped ? 'skipped' : ok ? 'ok' : 'bad'}">
              <div class="review-head">
                <strong>Pregunta ${i + 1}</strong>
                <span class="badge">${q.area || ''}</span>
              </div>
              <div class="question-text review-q">${q.question}</div>
              <p class="topic-meta">
                Tu respuesta: <strong>${letter}</strong>
                ${!skipped && !ok ? ` · Correcta: <strong>${correctLetter}</strong>` : ''}
                ${skipped ? ' · Sin responder' : ok ? ' · Correcta' : ' · Incorrecta'}
              </p>
              ${!ok ? `<p class="review-expl">${q.explanation || ''}</p>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </details>
  ` : '';

  container.innerHTML = `
    <div class="quiz-card essay-result">
      <h2>${resultTitle}</h2>
      <p class="page-sub">${title}${finishReason === 'timeout' ? ' · Tiempo agotado' : ''}</p>
      <div class="results-grid">
        <div class="stat-box"><strong>${correct}/${total}</strong><span>Correctas</span></div>
        ${paesBlock}
        <div class="stat-box"><strong>${formatTimeHMS(timeUsed)}</strong><span>Tiempo usado</span></div>
      </div>
      ${essayType === 'diagnostic' && paesScore ? `
        <div class="card" style="margin-top:1rem;background:#eff6ff;border-color:#93c5fd">
          <strong>Puntaje diagnostico registrado</strong>
          <p class="topic-meta" style="margin-top:0.35rem">PAES ${paesScore.puntajePaes} · Puntaje P ${paesScore.puntajeP}. Este es tu punto de partida antes de estudiar.</p>
        </div>` : ''}
      ${paesScore ? `<p class="topic-meta" style="margin-top:0.75rem">Tabla de transformacion PAES ${paesScore.scoringYear} · ${paesScore.scoredTotal} preguntas puntuadas.</p>` : ''}
      <p style="margin:1rem 0;color:var(--muted)">
        ${score >= 80 ? 'Excelente resultado. Sigue con la siguiente unidad.' : score >= 60 ? 'Buen trabajo. Revisa las preguntas incorrectas abajo.' : 'Repasa el contenido y vuelve a intentar.'}
      </p>
      ${reviewHtml}
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

  const { buildQuestionSet, getEssayMeta, recordDiagnostic, recordUnitEssay, recordCheckpoint } =
    await import(`./learning-path.js?v=${CACHE_VERSION}`);
  const tests = await loadTests();
  const test = tests.find(t => t.id === testId);
  const meta = getEssayMeta(type, test);
  const questions = await buildQuestionSet(testId, { type, lessonId, count: meta.count });
  const extra = questions.length < meta.count
    ? ` · Banco actual: ${questions.length}/${meta.count} preguntas`
    : '';

  await runTimedEssay(container, {
    ...meta,
    description: meta.description + extra,
    questions,
    testId,
    essayType: type,
    lessonId,
    onComplete: (result) => {
      if (type === 'diagnostic') recordDiagnostic(testId, result);
      else if (type === 'unit') recordUnitEssay(testId, lessonId, result);
      else if (type === 'checkpoint') recordCheckpoint(testId, result);
    },
  });
}
