/**
 * Hover and keyboard tooltips for build-time SVG charts.
 *
 * Markup comes from src/components/charts/ChartTip.astro (the tooltip box and a
 * live region) placed inside a positioned host. Two custom elements use it:
 *
 *   <tn-series-hover>  a time-series chart. Reads its points from a JSON
 *                      <script data-config> child; the pointer or the arrow keys
 *                      pick the nearest x, and a guide line, dots and the
 *                      tooltip follow. Focusable, so keyboard users get the same.
 *   <tn-tips>          discrete marks (bar segments, bars). Any descendant with
 *                      `data-tip` (the title) and optional `data-tip-rows` (JSON
 *                      [label, value, colour?][]) shows a tooltip on hover or focus.
 */

export type TipRow = [label: string, value: string, color?: string];

export class TipBox {
  readonly box: HTMLElement;
  readonly live: HTMLElement | null;
  constructor(readonly host: HTMLElement) {
    this.box = host.querySelector<HTMLElement>("[data-tip-box]")!;
    this.live = host.querySelector<HTMLElement>("[data-tip-live]");
  }

  /** Shows the tooltip with its anchor point (relative to the host) at `x`, `y`. */
  show(title: string, rows: TipRow[], x: number, y: number, announce = false) {
    const t = this.box.querySelector("[data-tip-title]")!;
    const list = this.box.querySelector("[data-tip-rows]")!;
    t.textContent = title;
    list.replaceChildren(
      ...rows.map(([label, value, color]) => {
        const li = document.createElement("li");
        li.className = "flex items-center gap-2";
        if (color) {
          const sw = document.createElement("span");
          sw.className = "size-2.5 shrink-0 rounded-sm";
          sw.style.background = color;
          li.append(sw);
        }
        const l = document.createElement("span");
        l.className = "text-secondary";
        l.textContent = label;
        const v = document.createElement("span");
        v.className = "ms-auto ps-3 font-semibold text-primary tabular-nums";
        v.textContent = value;
        li.append(l, v);
        return li;
      }),
    );
    this.box.hidden = false;
    const w = this.box.offsetWidth;
    const h = this.box.offsetHeight;
    const W = this.host.clientWidth;
    // Beside the anchor, flipping sides past the middle; never outside the host.
    let left = x > W / 2 ? x - w - 12 : x + 12;
    left = Math.max(0, Math.min(left, W - w));
    let top = y - h / 2;
    top = Math.max(0, Math.min(top, this.host.clientHeight - h));
    this.box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    if (announce && this.live) this.live.textContent = `${title}. ${rows.map((r) => `${r[0]}: ${r[1]}`).join(". ")}`;
  }

  hide() {
    this.box.hidden = true;
  }
}

export interface SeriesConfig {
  /** x positions as fractions of the plot width, ascending. */
  x: number[];
  labels: string[];
  /** `dot: false` lists a series in the tooltip without a dot on the chart. */
  series: { label: string; color: string; dp?: number; pre?: string; suf?: string; signed?: boolean; scale?: number; dot?: boolean }[];
  /** values[series][i]; null where the series has no value. */
  values: (number | null)[][];
  yMin: number;
  yMax: number;
  /** The plot's top offset and height in px, within the host. */
  top: number;
  plotH: number;
  /** For step data: the value at a point holds until the next point. */
  step?: boolean;
  /** Put before every label, e.g. "Fiscal year ". */
  labelPrefix?: string;
  /** "month": labels are "YYYY-MM", shown as "August 1981". */
  labelFormat?: "month";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function label(cfg: SeriesConfig, i: number): string {
  const raw = cfg.labels[i]!;
  const text = cfg.labelFormat === "month" && /^\d{4}-\d{2}/.test(raw) ? `${MONTHS[Number(raw.slice(5, 7)) - 1]} ${raw.slice(0, 4)}${raw.slice(7)}` : raw;
  return `${cfg.labelPrefix ?? ""}${text}`;
}

export function formatValue(v: number, s: SeriesConfig["series"][number]): string {
  const n = v * (s.scale ?? 1);
  const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: s.dp ?? 1, maximumFractionDigits: s.dp ?? 1 });
  const sign = n < 0 ? "−" : s.signed && n > 0 ? "+" : "";
  return `${sign}${s.pre ?? ""}${abs}${s.suf ?? ""}`;
}

class SeriesHover extends HTMLElement {
  #i = -1;
  connectedCallback() {
    const cfg = JSON.parse(this.querySelector("script[data-config]")!.textContent!) as SeriesConfig;
    const tip = new TipBox(this);
    const guide = this.querySelector<HTMLElement>("[data-guide]");
    const dots = cfg.series.map((s) => {
      const d = document.createElement("span");
      d.className = "pointer-events-none absolute hidden size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface";
      d.style.background = s.color;
      this.append(d);
      return d;
    });
    const n = cfg.x.length;

    const show = (i: number, announce: boolean) => {
      this.#i = i;
      const W = this.clientWidth;
      const px = cfg.x[i]! * W;
      if (guide) {
        guide.hidden = false;
        guide.style.transform = `translateX(${Math.round(px)}px)`;
      }
      const rows: [string, string, string][] = [];
      cfg.series.forEach((s, k) => {
        const v = cfg.values[k]![i];
        const d = dots[k]!;
        if (v === null || v === undefined) {
          d.classList.add("hidden");
          return;
        }
        rows.push([s.label, formatValue(v, s), s.color]);
        if (s.dot === false) {
          d.classList.add("hidden");
          return;
        }
        const y = cfg.top + (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)) * cfg.plotH;
        d.style.left = `${px}px`;
        d.style.top = `${Math.max(cfg.top, Math.min(cfg.top + cfg.plotH, y))}px`;
        d.classList.remove("hidden");
      });
      tip.show(label(cfg, i), rows, px, cfg.top + cfg.plotH * 0.35, announce);
    };
    const hide = () => {
      tip.hide();
      if (guide) guide.hidden = true;
      dots.forEach((d) => d.classList.add("hidden"));
    };
    const nearest = (clientX: number) => {
      const f = (clientX - this.getBoundingClientRect().left) / this.clientWidth;
      if (cfg.step) {
        let i = 0;
        while (i + 1 < n && cfg.x[i + 1]! <= f) i++;
        return i;
      }
      let best = 0;
      for (let i = 1; i < n; i++) if (Math.abs(cfg.x[i]! - f) < Math.abs(cfg.x[best]! - f)) best = i;
      return best;
    };

    this.addEventListener("pointermove", (e) => show(nearest(e.clientX), false));
    this.addEventListener("pointerdown", (e) => show(nearest(e.clientX), false));
    this.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && document.activeElement !== this) hide();
    });
    this.addEventListener("focus", () => show(this.#i < 0 ? n - 1 : this.#i, true));
    this.addEventListener("blur", hide);
    this.addEventListener("keydown", (e) => {
      const page = Math.max(1, Math.round(n / 10));
      const moves: Record<string, number> = {
        ArrowLeft: -1,
        ArrowDown: -1,
        ArrowRight: 1,
        ArrowUp: 1,
        PageDown: -page,
        PageUp: page,
        Home: -n,
        End: n,
      };
      if (e.key === "Escape") return hide();
      const m = moves[e.key];
      if (m === undefined) return;
      e.preventDefault();
      show(Math.max(0, Math.min(n - 1, (this.#i < 0 ? n - 1 : this.#i) + m)), true);
    });
  }
}

class Tips extends HTMLElement {
  connectedCallback() {
    const tip = new TipBox(this);
    const show = (el: HTMLElement, announce: boolean) => {
      const rows = el.dataset.tipRows ? (JSON.parse(el.dataset.tipRows) as TipRow[]) : [];
      const r = el.getBoundingClientRect();
      const h = this.getBoundingClientRect();
      tip.show(el.dataset.tip ?? "", rows, r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, announce);
    };
    const target = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>("[data-tip]");
    this.addEventListener("pointerover", (e) => {
      const el = target(e);
      if (el) show(el, false);
    });
    this.addEventListener("pointerout", (e) => {
      const el = target(e);
      if (el && !el.contains(e.relatedTarget as Node | null) && document.activeElement !== el) tip.hide();
    });
    this.addEventListener("focusin", (e) => {
      const el = target(e);
      if (el) show(el, true);
    });
    this.addEventListener("focusout", () => tip.hide());
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape") tip.hide();
    });
  }
}

if (!customElements.get("tn-series-hover")) customElements.define("tn-series-hover", SeriesHover);
if (!customElements.get("tn-tips")) customElements.define("tn-tips", Tips);
