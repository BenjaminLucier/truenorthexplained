/**
 * Party families point at colour tokens, and every colour token has a light
 * value, a dark value, and the same dark value in the no-JavaScript fallback
 * (`@media (prefers-color-scheme: dark) { :root:not([data-theme]) … }`).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FEDERAL,
  FEDERAL_FAMILIES,
  FEDERAL_PARTY_KEYS,
  PROVINCIAL,
  PROVINCIAL_FAMILIES,
} from "../../src/lib/party-families";

const css = readFileSync(new URL("../../src/styles/global.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Custom properties set in each kind of theme block, merged across the file. */
function themeBlocks() {
  const blocks = { light: new Map<string, string>(), dark: new Map<string, string>(), fallback: new Map<string, string>() };
  const block = /(@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\)|\[data-theme="dark"\]|(?<![\w-]):root) \{([^}]*)\}/g;
  for (const [, selector, body] of css.matchAll(block)) {
    const kind = selector!.startsWith("@media") ? "fallback" : selector!.startsWith("[") ? "dark" : "light";
    for (const [, name, value] of body!.matchAll(/(--tn-[\w-]+)\s*:\s*([^;]+);/g)) blocks[kind].set(name!, value!.trim());
  }
  return blocks;
}

describe("theme tokens in global.css", () => {
  const { light, dark, fallback } = themeBlocks();

  it("finds the three kinds of block", () => {
    expect(light.size).toBeGreaterThan(20);
    expect(dark.size).toBeGreaterThan(20);
    expect(fallback.size).toBeGreaterThan(20);
  });

  it("gives every light token a dark value, and the reverse", () => {
    expect([...light.keys()].filter((k) => !dark.has(k))).toEqual([]);
    expect([...dark.keys()].filter((k) => !light.has(k))).toEqual([]);
  });

  it("repeats every dark value in the no-JavaScript fallback", () => {
    const missing = [...dark.keys()].filter((k) => !fallback.has(k));
    const different = [...dark.keys()].filter((k) => fallback.has(k) && fallback.get(k) !== dark.get(k));
    expect({ missing, different }).toEqual({ missing: [], different: [] });
    expect([...fallback.keys()].filter((k) => !dark.has(k))).toEqual([]);
  });
});

describe("party families", () => {
  const { light } = themeBlocks();
  const tokenOf = (color: string) => color.match(/^var\((--tn-party-[a-z]+)\)$/)?.[1];

  it("cover every federal and provincial family, with a defined colour token each", () => {
    expect(Object.keys(FEDERAL).sort()).toEqual([...FEDERAL_FAMILIES].sort());
    expect(Object.keys(PROVINCIAL).sort()).toEqual([...PROVINCIAL_FAMILIES].sort());
    for (const info of [...Object.values(FEDERAL), ...Object.values(PROVINCIAL)]) {
      const token = tokenOf(info.color);
      expect(token, info.label).toBeDefined();
      expect(light.has(token!), `${token} is defined`).toBe(true);
    }
  });

  it("classify every Wikipedia party key into a real federal family", () => {
    for (const [key, { family }] of Object.entries(FEDERAL_PARTY_KEYS)) expect(FEDERAL_FAMILIES, key).toContain(family);
  });
});
