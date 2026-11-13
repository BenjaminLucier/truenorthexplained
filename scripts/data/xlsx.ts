/**
 * A minimal .xlsx reader: enough to pull numbers and labels out of a
 * government workbook without a spreadsheet library. An .xlsx file is a zip
 * of XML parts; this reads the shared strings and one worksheet into a grid.
 */
import { strFromU8, unzipSync } from "fflate";

export type Cell = string | number | null;
export interface Workbook {
  sheetNames: string[];
  /** Rows of cells, indexed by column letter position (A = 0). */
  sheet(name: string): Cell[][];
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");

const colIndex = (letters: string) => [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

export function readXlsx(bytes: Uint8Array): Workbook {
  const zip = unzipSync(bytes);
  const part = (path: string) => {
    const f = zip[path];
    if (!f) throw new Error(`${path} missing from workbook`);
    return strFromU8(f);
  };
  const shared: string[] = [];
  if (zip["xl/sharedStrings.xml"]) {
    for (const m of part("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(decode([...m[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
    }
  }
  const rels = part("xl/_rels/workbook.xml.rels");
  const target = (id: string) => {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${id}"`));
    const t = rel?.match(/Target="([^"]*)"/)?.[1];
    if (!t) throw new Error(`No worksheet for relationship ${id}`);
    return `xl/${t.replace(/^\/?xl\//, "")}`;
  };
  const sheets = [...part("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map((m) => ({
    name: decode(m[0].match(/name="([^"]*)"/)![1]!),
    path: target(m[0].match(/r:id="([^"]*)"/)![1]!),
  }));

  return {
    sheetNames: sheets.map((s) => s.name),
    sheet(name) {
      const s = sheets.find((x) => x.name === name);
      if (!s) throw new Error(`No sheet named "${name}"`);
      const rows: Cell[][] = [];
      for (const row of part(s.path).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const cells: Cell[] = [];
        for (const c of row[1]!.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          const raw = c[3]?.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? c[3]?.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1];
          if (raw === undefined) continue;
          const type = c[2]!.match(/t="(\w+)"/)?.[1];
          cells[colIndex(c[1]!)] = type === "s" ? shared[Number(raw)]! : type === "str" || type === "inlineStr" ? decode(raw) : Number(raw);
        }
        rows.push(Array.from(cells, (v) => v ?? null));
      }
      return rows;
    },
  };
}
