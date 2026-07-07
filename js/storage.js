const STORAGE_KEY = 'estudio-paes-m2';

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultProgress();
  } catch {
    return defaultProgress();
  }
}

function defaultProgress() {
  return {
    exercises: {},
    essays: [],
    lessonsRead: [],
    streak: 0,
    lastVisit: null,
  };
}

export function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

export function getStats() {
  const p = loadProgress();
  const exIds = Object.keys(p.exercises);
  const totalAttempts = exIds.reduce((s, id) => s + p.exercises[id].attempts, 0);
  const totalCorrect = exIds.reduce((s, id) => s + p.exercises[id].correct, 0);
  const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const essays = p.essays;
  const avgEssay = essays.length
    ? Math.round(essays.reduce((s, e) => s + e.score, 0) / essays.length)
    : 0;
  return {
    lessonsRead: p.lessonsRead.length,
    totalAttempts,
    totalCorrect,
    accuracy,
    essaysDone: essays.length,
    avgEssay,
    essays,
    exercises: p.exercises,
  };
}
