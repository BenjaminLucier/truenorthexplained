/**
 * Shared settings for the federal finance charts: the eras shaded behind them
 * and the fiscal-year axis. A fiscal year is plotted at the year it starts in.
 */
import { finances } from "../../lib/money";

export const years = finances.years;
export const first = years[0]!;
export const last = years.at(-1)!;
export const X_MIN = first.year;
export const X_MAX = last.year;
export const X_TICKS = [1930, 1950, 1970, 1990, 2010].filter((t) => t > X_MIN && t < X_MAX);

/** Lanes and label anchors are picked so the labels don't collide at phone width. */
export const ERAS = [
  { from: 1930, to: 1939, label: "Depression", lane: 1 },
  { from: 1939, to: 1945.9, label: "Second World War", lane: 0 },
  { from: 1993, to: 1997.9, label: "1990s cuts", lane: 0, anchor: "end" as const },
  { from: 2008, to: 2010.9, label: "2008 crisis", lane: 1, anchor: "end" as const },
  { from: 2020, to: 2021.9, label: "COVID-19", lane: 0 },
].filter((e) => e.from >= X_MIN && e.from <= X_MAX);

export const pct1 = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;
export const SOURCE_NOTE =
  "Fiscal years run April to March. From 1966-67, Finance Canada's Fiscal Reference Tables; before that, Statistics Canada's Historical Statistics of Canada (cash-basis public accounts) divided by gross national expenditure. Finance Canada notes that figures from 1983-84 on, on a full accrual basis, are not directly comparable with earlier years.";
