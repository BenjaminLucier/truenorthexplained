/**
 * Quiz progress, stored only in this browser. Every access is guarded:
 * private windows or blocked storage just mean progress isn't remembered.
 */
export interface Attempt {
  correct: boolean;
  at: string;
}
export type Progress = Record<string, Attempt>;

const KEY = "tne-quiz-v1";
const EVENT = "tne:progress";

export function readProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as Progress) : {};
  } catch {
    return {};
  }
}

/** How many of these questions were last answered correctly. */
export function scoreFor(ids: string[], progress: Progress = readProgress()): { right: number; total: number } {
  return { right: ids.filter((id) => progress[id]?.correct).length, total: ids.length };
}

export function recordAttempt(id: string, correct: boolean): void {
  const progress = readProgress();
  progress[id] = { correct, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onProgress(callback: () => void): void {
  window.addEventListener(EVENT, callback);
  // Keep other open tabs in sync too.
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) callback();
  });
}
