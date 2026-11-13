import { defineCollection } from "astro:content";
import { glob, type Loader } from "astro/loaders";
import { z } from "astro/zod";
import { readdir, readFile } from "node:fs/promises";
import { parse } from "yaml";
import { sitePathFromEntry } from "./lib/paths";

const pages = defineCollection({
  loader: glob({
    base: "./content",
    pattern: ["**/*.en.md"],
    generateId: ({ entry }) => sitePathFromEntry(entry),
  }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    status: z.enum(["stub", "draft", "reviewed"]),
    order: z.number().optional(),
    parent: z.string().optional(),
    deep_dives: z.array(z.string()).optional(),
    quiz: z.array(z.string()).optional(),
    // Provinces and territories
    type: z.enum(["province", "territory"]).optional(),
    capital: z.string().optional(),
    joined: z.number().optional(),
    // Home page
    hero: z
      .object({
        title: z.string(),
        lede: z.string(),
        primary: z.object({ label: z.string(), href: z.string() }),
        secondary: z.object({ label: z.string(), href: z.string() }),
      })
      .optional(),
    ideas: z.array(z.object({ title: z.string(), text: z.string(), href: z.string() })).optional(),
  }),
});

const question = z.object({
  id: z.string(),
  pages: z.array(z.string()).min(1),
  tags: z.array(z.string()).optional(),
  type: z.enum(["single", "multi", "true-false"]),
  question: z.string(),
  // YAML turns options like `11` into numbers; keep them as text.
  options: z.array(z.union([z.string(), z.number()]).transform(String)).optional(),
  answer: z.union([z.number().int(), z.array(z.number().int()), z.boolean()]),
  explanation: z.string(),
  source: z.string(),
});

/** Loads every question from content/quizzes/*.en.yaml as its own entry. */
function quizLoader(): Loader {
  return {
    name: "quiz-bank",
    load: async ({ store, parseData, generateDigest, logger, watcher }) => {
      const dir = new URL("../content/quizzes/", import.meta.url);
      const load = async () => {
        store.clear();
        const files = (await readdir(dir)).filter((f) => f.endsWith(".en.yaml")).sort();
        for (const file of files) {
          const list = parse(await readFile(new URL(file, dir), "utf8")) ?? [];
          for (const raw of list as Record<string, unknown>[]) {
            const id = String(raw.id);
            if (store.has(id)) throw new Error(`Duplicate quiz id "${id}" in ${file}`);
            const data = await parseData({ id, data: { ...raw, file } });
            store.set({ id, data, digest: generateDigest(data) });
          }
        }
        logger.info(`Loaded ${store.keys().length} quiz questions`);
      };
      await load();
      watcher?.add(dir.pathname);
      watcher?.on("change", (path: string) => {
        if (path.startsWith(dir.pathname)) void load();
      });
    },
  };
}

const quizzes = defineCollection({
  loader: quizLoader(),
  schema: question.extend({ file: z.string() }).superRefine((q, ctx) => {
    if (q.type === "true-false" && typeof q.answer !== "boolean")
      ctx.addIssue({ code: "custom", message: "true-false answer must be true or false" });
    if (q.type === "single" && (typeof q.answer !== "number" || !q.options || q.answer >= q.options.length))
      ctx.addIssue({ code: "custom", message: "single answer must index into options" });
    if (q.type === "multi" && (!Array.isArray(q.answer) || !q.options))
      ctx.addIssue({ code: "custom", message: "multi answer must be a list of option indexes" });
  }),
});

export const collections = { pages, quizzes };
