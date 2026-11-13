import { onProgress, scoreFor } from "./progress";
import { t } from "../i18n/en";

/** Progress ring for a set of question ids (see ProgressRing.astro). */
class QuizRing extends HTMLElement {
  connectedCallback() {
    this.render();
    onProgress(() => this.render());
  }

  render() {
    const { right, total } = scoreFor((this.dataset.ids ?? "").split(" ").filter(Boolean));
    const pct = total ? (right / total) * 100 : 0;
    const arc = this.querySelector<SVGCircleElement>("[data-arc]");
    if (arc) arc.style.strokeDasharray = `${pct} 100`;
    const label = t.quiz.progress(right, total);
    const count = this.querySelector<HTMLElement>("[data-count]");
    if (count) count.textContent = count.dataset.count === "long" ? label : `${right}/${total}`;
    this.setAttribute("aria-label", label);
    this.title = label;
    this.toggleAttribute("data-complete", total > 0 && right === total);
  }
}

if (!customElements.get("quiz-ring")) customElements.define("quiz-ring", QuizRing);
