import { clearProgress, onProgress, readProgress, recordAttempt } from "./progress";
import { t } from "../i18n/en";

const strings = {
  correct: `${t.quiz.correct}.`,
  incorrect: `${t.quiz.incorrect}.`,
  gotBefore: `✓ ${t.quiz.gotBefore}`,
  missedBefore: t.quiz.missedBefore,
};

/** One question: checks the answer, shows feedback, records the attempt. */
export class QuizQuestion extends HTMLElement {
  private form!: HTMLFormElement;

  connectedCallback() {
    this.form = this.querySelector("form")!;
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.check();
    });
    this.querySelector("[data-retry]")!.addEventListener("click", () => this.reset());
    this.showHistory();
    onProgress(() => this.showHistory());
  }

  get id(): string {
    return this.dataset.id ?? "";
  }

  private check() {
    const answer = JSON.parse(this.dataset.answer ?? "[]") as number[];
    const chosen = [...this.form.querySelectorAll<HTMLInputElement>("input:checked")].map((i) => Number(i.value));
    if (chosen.length === 0) return;
    const correct = chosen.length === answer.length && chosen.every((c) => answer.includes(c));

    for (const label of this.form.querySelectorAll<HTMLElement>("[data-option]")) {
      const i = Number(label.dataset.option);
      if (answer.includes(i)) label.dataset.state = "correct";
      else if (chosen.includes(i)) label.dataset.state = "incorrect";
      label.querySelector("input")!.disabled = true;
    }

    const template = this.querySelector<HTMLTemplateElement>("[data-feedback-template]")!;
    const feedback = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    feedback.dataset.result = correct ? "correct" : "incorrect";
    feedback.querySelector("[data-result-label]")!.textContent = correct ? strings.correct : strings.incorrect;
    this.querySelector("[data-feedback]")!.replaceChildren(feedback);

    this.querySelector<HTMLButtonElement>("[data-check]")!.hidden = true;
    const retry = this.querySelector<HTMLButtonElement>("[data-retry]")!;
    retry.hidden = false;
    recordAttempt(this.id, correct);
  }

  reset() {
    this.form.reset();
    for (const label of this.form.querySelectorAll<HTMLElement>("[data-option]")) {
      delete label.dataset.state;
      label.querySelector("input")!.disabled = false;
    }
    this.querySelector("[data-feedback]")!.replaceChildren();
    this.querySelector<HTMLButtonElement>("[data-check]")!.hidden = false;
    this.querySelector<HTMLButtonElement>("[data-retry]")!.hidden = true;
  }

  private showHistory() {
    const badge = this.querySelector<HTMLElement>("[data-history]")!;
    const attempt = readProgress()[this.id];
    badge.hidden = !attempt;
    if (attempt) badge.textContent = attempt.correct ? strings.gotBefore : strings.missedBefore;
  }
}

/** "3 of 5 answered correctly", for a set of question ids. */
export class QuizSummary extends HTMLElement {
  connectedCallback() {
    this.render();
    onProgress(() => this.render());
    this.querySelector("[data-reset]")?.addEventListener("click", () => {
      if (confirm(this.dataset.confirm ?? "Clear progress?")) clearProgress();
    });
  }

  render() {
    const ids = (this.dataset.ids ?? "").split(" ").filter(Boolean);
    const progress = readProgress();
    const right = ids.filter((id) => progress[id]?.correct).length;
    const text = this.querySelector("[data-text]");
    if (text) text.textContent = t.quiz.progress(right, ids.length);
    const bar = this.querySelector<HTMLElement>("[data-bar]");
    if (bar) bar.style.width = `${ids.length ? (right / ids.length) * 100 : 0}%`;
  }
}

customElements.define("quiz-question", QuizQuestion);
customElements.define("quiz-summary", QuizSummary);
