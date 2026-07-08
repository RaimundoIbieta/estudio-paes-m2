import { APP_CONFIG, CACHE_VERSION } from './config.js';
import { getTestProgress, updateTestProgress } from './storage.js';
import { fetchTestData } from './test-context.js';

export async function loadLessons(testId) {
  const lessons = await fetchTestData(testId, 'content');
  return lessons.filter(l => l.id !== 'placeholder');
}

export function getGate(testId) {
  const tp = getTestProgress(testId);
  if (!tp.diagnosticDone) {
    return {
      type: 'diagnostic',
      title: 'Ensayo diagnóstico inicial',
      description: 'Rinde el ensayo diagnóstico completo (igual duración y preguntas que la PAES real) antes de ver el contenido.',
      route: '#/ensayo/diagnostico',
      blocked: ['contenido'],
    };
  }

  const pendingUnit = findPendingUnitEssay(testId, tp);
  if (pendingUnit) {
    return {
      type: 'unit-essay',
      lessonId: pendingUnit,
      title: 'Mini ensayo de unidad',
      description: 'Completa el mini ensayo de la unidad que acabas de estudiar para desbloquear la siguiente.',
      route: `#/ensayo/unidad/${pendingUnit}`,
      blocked: ['contenido'],
    };
  }

  const pendingCheckpoint = findPendingCheckpoint(testId, tp);
  if (pendingCheckpoint) {
    return {
      type: 'checkpoint',
      afterUnits: pendingCheckpoint,
      title: 'Ensayo de progreso',
      description: `Has completado ${APP_CONFIG.essays.checkpointEveryUnits} unidades. Rinde el ensayo de progreso obligatorio.`,
      route: '#/ensayo/progreso',
      blocked: ['contenido'],
    };
  }

  return {
    type: 'study',
    title: 'Continúa estudiando',
    description: 'Puedes acceder al contenido y practicar.',
    route: '#/contenido',
    blocked: [],
  };
}

function findPendingUnitEssay(testId, tp) {
  const lessons = tp.lessonsCompleted || [];
  for (const id of lessons) {
    if (!tp.unitEssays?.[id]) return id;
  }
  return null;
}

function findPendingCheckpoint(testId, tp) {
  const n = (tp.lessonsCompleted || []).length;
  const every = APP_CONFIG.essays.checkpointEveryUnits;
  if (n < every || n % every !== 0) return null;
  const checkpointIndex = n / every;
  const done = (tp.checkpoints || []).length;
  if (done >= checkpointIndex) return null;
  return n;
}

export async function getUnlockedLessonIds(testId) {
  const lessons = await loadLessons(testId);
  const tp = getTestProgress(testId);
  if (!tp.diagnosticDone) return [];

  const gate = getGate(testId);
  if (gate.type === 'unit-essay') {
    return [...(tp.lessonsCompleted || [])];
  }
  if (gate.type === 'checkpoint') {
    return (tp.lessonsCompleted || []).filter(id => tp.unitEssays?.[id]);
  }

  const unlocked = [];
  for (const lesson of lessons) {
    unlocked.push(lesson.id);
    if (!tp.lessonsCompleted?.includes(lesson.id)) break;
    if (!tp.unitEssays?.[lesson.id]) break;
  }
  return unlocked;
}

export async function canOpenLesson(testId, lessonId) {
  const unlocked = await getUnlockedLessonIds(testId);
  return unlocked.includes(lessonId);
}

export async function getNextLesson(testId) {
  const lessons = await loadLessons(testId);
  const tp = getTestProgress(testId);
  const completed = new Set(tp.lessonsCompleted || []);
  return lessons.find(l => !completed.has(l.id)) || null;
}

export async function getStudyRoadmap(testId) {
  const lessons = await loadLessons(testId);
  const tp = getTestProgress(testId);
  const gate = getGate(testId);

  const steps = [
    {
      id: 'diagnostic',
      label: 'Ensayo diagnóstico',
      done: tp.diagnosticDone,
      score: tp.diagnosticScore,
      paes: tp.diagnosticPaes,
      current: gate.type === 'diagnostic',
    },
  ];

  lessons.forEach((lesson, i) => {
    const done = (tp.lessonsCompleted || []).includes(lesson.id);
    const essayDone = !!tp.unitEssays?.[lesson.id];
    steps.push({
      id: lesson.id,
      label: lesson.title,
      area: lesson.area,
      lessonDone: done,
      essayDone,
      done: done && essayDone,
      current: gate.type === 'unit-essay' && gate.lessonId === lesson.id,
    });

    if ((i + 1) % APP_CONFIG.essays.checkpointEveryUnits === 0) {
      const cpIndex = (i + 1) / APP_CONFIG.essays.checkpointEveryUnits;
      const cpDone = (tp.checkpoints || []).length >= cpIndex;
      steps.push({
        id: `checkpoint-${cpIndex}`,
        label: `Ensayo de progreso ${cpIndex}`,
        isCheckpoint: true,
        done: cpDone,
        current: gate.type === 'checkpoint' && !cpDone,
      });
    }
  });

  return { steps, gate, lessons, testProgress: tp };
}

export function recordDiagnostic(testId, result) {
  const payload = typeof result === 'number'
    ? { score: result }
    : result;
  updateTestProgress(testId, {
    diagnosticDone: true,
    diagnosticScore: payload.score,
    diagnosticP: payload.puntajeP ?? null,
    diagnosticPaes: payload.puntajePaes ?? null,
    lastGate: 'study',
  });
}

export function recordUnitEssay(testId, lessonId, result) {
  const tp = getTestProgress(testId);
  const payload = typeof result === 'number' ? { score: result } : result;
  const unitEssays = {
    ...(tp.unitEssays || {}),
    [lessonId]: {
      score: payload.score,
      puntajeP: payload.puntajeP ?? null,
      puntajePaes: payload.puntajePaes ?? null,
      date: new Date().toISOString(),
    },
  };
  updateTestProgress(testId, { unitEssays, lastGate: 'study' });
}

export function recordCheckpoint(testId, result) {
  const tp = getTestProgress(testId);
  const payload = typeof result === 'number' ? { score: result } : result;
  const checkpoints = [...(tp.checkpoints || []), {
    score: payload.score,
    puntajeP: payload.puntajeP ?? null,
    puntajePaes: payload.puntajePaes ?? null,
    date: new Date().toISOString(),
  }];
  updateTestProgress(testId, { checkpoints, lastGate: 'study' });
}

export async function buildQuestionSet(testId, { type, lessonId = null, count }) {
  let lessonArea = null;
  if (lessonId) {
    const lessons = await loadLessons(testId);
    lessonArea = lessons.find(l => l.id === lessonId)?.area || null;
  }
  const { buildQuestionSet: fromBank, normalizeQuestion } = await import(`./question-bank.js?v=${CACHE_VERSION}`);
  const raw = await fromBank(testId, { type, lessonArea, count });
  return raw.map(normalizeQuestion);
}

export function getEssayMeta(type, test) {
  const cfg = APP_CONFIG.essays;
  const total = test?.questions || 65;
  const duration = test?.durationMinutes || 140;

  if (type === 'diagnostic') {
    return {
      title: `Ensayo diagnóstico ${test?.short || 'PAES'}`,
      description: `Simulacro completo inicial (${total} preguntas · ${duration} min). Cada intento sortea preguntas distintas del banco PAES. Obligatorio antes de estudiar.`,
      count: total,
      durationMinutes: duration,
    };
  }
  if (type === 'unit') {
    return {
      title: 'Mini ensayo de unidad',
      description: `${cfg.unitCount} preguntas para verificar lo aprendido en esta unidad.`,
      count: cfg.unitCount,
      durationMinutes: cfg.unitDurationMinutes,
    };
  }
  return {
    title: `Ensayo de progreso ${test?.short || ''}`,
    description: `Evaluación completa cada ${cfg.checkpointEveryUnits} unidades (${total} preguntas).`,
    count: total,
    durationMinutes: duration,
  };
}
