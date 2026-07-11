const STORAGE_KEY = 'estudio-paes-m2';

function defaultProgress() {
  return {
    exercises: {},
    essays: [],
    lessonsRead: [],
    streak: 0,
    lastVisit: null,
    tests: {},
  };
}

function normalizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return defaultProgress();
  return {
    ...defaultProgress(),
    ...raw,
    exercises: raw.exercises && typeof raw.exercises === 'object' ? raw.exercises : {},
    essays: Array.isArray(raw.essays) ? raw.essays : [],
    lessonsRead: Array.isArray(raw.lessonsRead) ? raw.lessonsRead : [],
    tests: raw.tests && typeof raw.tests === 'object' ? raw.tests : {},
  };
}

export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return normalizeProgress(raw);
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(data)));
}

export function getTestProgress(testId) {
  const p = loadProgress();
  if (!p.tests[testId]) {
    p.tests[testId] = {
      diagnosticDone: false,
      diagnosticScore: null,
      lessonsCompleted: [],
      unitEssays: {},
      checkpoints: [],
      lastGate: 'diagnostic',
    };
    saveProgress(p);
  }
  return p.tests[testId];
}

export function updateTestProgress(testId, patch) {
  const p = loadProgress();
  const current = p.tests[testId] || {
    diagnosticDone: false,
    diagnosticScore: null,
    lessonsCompleted: [],
    unitEssays: {},
    checkpoints: [],
    lastGate: 'diagnostic',
  };
  p.tests[testId] = { ...current, ...patch };
  saveProgress(p);
  return p.tests[testId];
}

/** Actualiza racha diaria (días consecutivos con actividad). */
export function touchStreak() {
  const p = loadProgress();
  const today = new Date().toISOString().slice(0, 10);
  const last = (p.lastVisit || '').slice(0, 10);
  if (last === today) {
    p.lastVisit = new Date().toISOString();
    saveProgress(p);
    return p.streak || 0;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  p.streak = last === y ? (p.streak || 0) + 1 : 1;
  p.lastVisit = new Date().toISOString();
  saveProgress(p);
  return p.streak;
}

export function recordExercise(id, correct) {
  const p = loadProgress();
  if (!p.exercises[id]) p.exercises[id] = { attempts: 0, correct: 0 };
  p.exercises[id].attempts += 1;
  if (correct) p.exercises[id].correct += 1;
  saveProgress(p);
  touchStreak();
}

export function recordEssay(result) {
  const p = loadProgress();
  p.essays.push({ ...result, date: new Date().toISOString() });
  saveProgress(p);
  touchStreak();
}

export function markLessonRead(id) {
  const p = loadProgress();
  if (!p.lessonsRead.includes(id)) p.lessonsRead.push(id);
  saveProgress(p);
}

export function completeLesson(testId, lessonId) {
  const tp = getTestProgress(testId);
  if (!tp.lessonsCompleted.includes(lessonId)) {
    tp.lessonsCompleted.push(lessonId);
    updateTestProgress(testId, { lessonsCompleted: tp.lessonsCompleted });
  }
  markLessonRead(lessonId);
  touchStreak();
}

export function getAchievements(testId = null) {
  const p = loadProgress();
  const tp = testId ? (p.tests?.[testId] || {}) : {};
  const essays = (p.essays || []).filter(e => !testId || e.testId === testId);
  const badges = [];
  if (tp.diagnosticDone) badges.push({ id: 'diag', label: 'Diagnóstico rendido', icon: '🎯' });
  if ((tp.lessonsCompleted || []).length >= 3) badges.push({ id: 'u3', label: '3 unidades estudiadas', icon: '📚' });
  if ((tp.lessonsCompleted || []).length >= 8) badges.push({ id: 'u8', label: '8 unidades estudiadas', icon: '🏆' });
  if (Object.keys(tp.unitEssays || {}).length >= 2) badges.push({ id: 'me2', label: '2 mini ensayos', icon: '⏱️' });
  if ((tp.checkpoints || []).length >= 1) badges.push({ id: 'cp', label: 'Ensayo de progreso', icon: '📈' });
  if ((p.streak || 0) >= 3) badges.push({ id: 'streak3', label: `Racha ${p.streak} días`, icon: '🔥' });
  if (essays.some(e => (e.score || 0) >= 70)) badges.push({ id: '70', label: 'Ensayo ≥ 70%', icon: '⭐' });
  return { streak: p.streak || 0, badges };
}

export function getStats(testId = null) {
  const p = loadProgress();
  const exercises = p.exercises || {};
  const exIds = Object.keys(exercises);
  const totalAttempts = exIds.reduce((s, id) => s + (exercises[id]?.attempts || 0), 0);
  const totalCorrect = exIds.reduce((s, id) => s + (exercises[id]?.correct || 0), 0);
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const essays = p.essays || [];
  const avgEssay = essays.length
    ? Math.round(essays.reduce((s, e) => s + (e.score || 0), 0) / essays.length)
    : 0;

  const testEssays = testId
    ? essays.filter(e => e.testId === testId)
    : essays;

  return {
    lessonsRead: (p.lessonsRead || []).length,
    totalAttempts,
    totalCorrect,
    accuracy,
    essaysDone: essays.length,
    avgEssay,
    essays,
    testEssays,
    exercises,
    tests: p.tests || {},
    lastVisit: p.lastVisit,
    streak: p.streak || 0,
  };
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
