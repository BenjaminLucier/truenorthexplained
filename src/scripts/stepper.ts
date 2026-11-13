/**
 * Shared behaviour for step-through widgets (bill-steps, election-to-government).
 *
 * Expected markup inside the element:
 *   [data-step]          one per step, in order (an <li> in the static <ol>)
 *   [data-step-title]    inside each step: short text for announcements
 *   [data-dot="n"]       optional buttons that jump to step n (0-based)
 *   [data-prev] [data-next] [data-position]
 *   [data-enhanced]      hidden until JavaScript runs (the controls)
 *   [data-live]          a polite live region
 *
 * Without JavaScript every step stays visible, so the widget reads as an ordered list.
 * With it, the element gets [data-js] and the current step gets [data-current]. The
 * widget's CSS should stack the steps in one grid cell and hide the others with
 * `visibility: hidden` (which also removes them from the accessibility tree).
 */
export class Stepper extends HTMLElement {
  protected steps: HTMLElement[] = [];
  protected index = 0;
  private live?: HTMLElement;

  connectedCallback() {
    this.steps = [...this.querySelectorAll<HTMLElement>("[data-step]")];
    this.live = this.querySelector<HTMLElement>("[data-live]") ?? undefined;
    for (const el of this.querySelectorAll<HTMLElement>("[data-enhanced]")) el.hidden = false;
    this.dataset.js = "";

    this.querySelector("[data-prev]")?.addEventListener("click", () => this.go(this.index - 1));
    this.querySelector("[data-next]")?.addEventListener("click", () => this.go(this.index + 1));
    for (const dot of this.querySelectorAll<HTMLElement>("[data-dot]")) {
      dot.addEventListener("click", () => this.go(Number(dot.dataset.dot)));
    }
    this.addEventListener("keydown", (e) => this.onKey(e));
    this.render(false);
  }

  /** Can the reader move to step `i`? Subclasses use this to gate a branch point. */
  protected canGo(i: number): boolean {
    return i >= 0 && i < this.steps.length;
  }

  /** Where focus goes when "Next" becomes unavailable mid-way (e.g. a choice is needed). */
  protected blockedFocus(): HTMLElement | null {
    return null;
  }

  protected go(i: number) {
    if (i === this.index || !this.canGo(i)) return;
    this.index = i;
    this.render(true);
  }

  private onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    // Leave arrow keys alone inside form fields (radio groups use them).
    if (target.closest("input, select, textarea")) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const map: Record<string, number> = {
      ArrowRight: this.index + 1,
      ArrowLeft: this.index - 1,
      Home: 0,
      End: this.steps.length - 1,
    };
    const to = map[e.key];
    if (to === undefined) return;
    e.preventDefault();
    if (e.key === "End") {
      // Jump as far as the reader is allowed to go.
      let last = this.index;
      for (let i = this.index + 1; i < this.steps.length && this.canGo(i); i++) last = i;
      this.go(last);
    } else {
      this.go(to);
    }
  }

  protected render(announce: boolean) {
    const total = this.steps.length;
    // Every step stays in the layout (stacked in one grid cell, see the widget CSS) so the
    // widget doesn't change height as the reader moves; only the current one is visible.
    this.steps.forEach((step, i) => {
      const current = i === this.index;
      if (current) step.dataset.current = "";
      else delete step.dataset.current;
      step.inert = !current;
    });
    for (const dot of this.querySelectorAll<HTMLElement>("[data-dot]")) {
      const i = Number(dot.dataset.dot);
      dot.dataset.state = i === this.index ? "current" : i < this.index ? "done" : "todo";
      if (i === this.index) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
      (dot as HTMLButtonElement).disabled = !this.canGo(i) && i !== this.index;
    }
    const prev = this.querySelector<HTMLButtonElement>("[data-prev]");
    const next = this.querySelector<HTMLButtonElement>("[data-next]");
    if (prev) prev.disabled = this.index === 0;
    if (next) next.disabled = !this.canGo(this.index + 1);
    // A button that just became disabled drops focus to <body>; hand it to its partner.
    if (prev?.disabled && document.activeElement === prev) next?.focus();
    if (next?.disabled && document.activeElement === next) (this.blockedFocus() ?? prev)?.focus();
    const position = this.querySelector("[data-position]");
    if (position) position.textContent = `Step ${this.index + 1} of ${total}`;
    if (announce && this.live) {
      const title = this.steps[this.index]?.querySelector("[data-step-title]")?.textContent?.trim() ?? "";
      this.live.textContent = `Step ${this.index + 1} of ${total}: ${title}`;
    }
  }
}
