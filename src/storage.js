// Persistent high-score table via localStorage.

const KEY = 'cosmodrift.highscores.v1';
const MAX_ENTRIES = 8;

const DEFAULTS = [
  { name: 'ACE', score: 12000 },
  { name: 'NVA', score: 9000 },
  { name: 'ZAP', score: 6500 },
  { name: 'KAI', score: 4000 },
  { name: 'ORB', score: 2500 },
];

export function loadScores() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULTS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULTS];
    return parsed
      .filter((e) => e && typeof e.score === 'number')
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [...DEFAULTS];
  }
}

export function qualifies(score) {
  if (score <= 0) return false;
  const scores = loadScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}

export function saveScore(name, score) {
  const scores = loadScores();
  scores.push({ name: (name || 'YOU').slice(0, 3).toUpperCase(), score });
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
  return trimmed;
}

export function topScore() {
  const s = loadScores();
  return s.length ? s[0].score : 0;
}
