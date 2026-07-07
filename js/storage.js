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

export function recordExercise(id, correct) {
  const p = loadProgress();
  if (!p.exercises[id]) p.exercises[id] = { attempts: 0, correct: 0 };
  p.exercises[id].attempts += 1;
  if (correct) p.exercises[id].correct += 1;
  p.lastVisit = new Date().toISOString();
  saveProgress(p);
}

export function recordEssay(result) {
  const p = loadProgress();
  p.essays.push({ ...result, date: new Date().toISOString() });
  saveProgress(p);
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
  };
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
