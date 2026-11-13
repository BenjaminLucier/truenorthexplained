/**
 * Just enough wikitext handling to read tables and infoboxes from the
 * grounding corpus (grounding/wikipedia/*.wiki). Not a general parser: it
 * removes references and comments, resolves links to their text, and lets the
 * caller rewrite templates innermost-first.
 */

/** A template call: its name and positional/named arguments (trimmed). */
export interface Template {
  name: string;
  args: string[];
  named: Record<string, string>;
}

/** Removes comments and <ref> tags, and turns [[target|text]] into text. */
export function clean(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/g, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]|]*)\]\]/g, "$1");
}

/**
 * Rewrites every template, innermost first, with `fn`. Return a string to
 * replace the template, or undefined to drop it.
 */
export function rewriteTemplates(text: string, fn: (t: Template) => string | undefined): string {
  const innermost = /\{\{([^{}]*)\}\}/;
  let out = text;
  for (let guard = 0; guard < 100_000; guard++) {
    const m = innermost.exec(out);
    if (!m) return out;
    const parts = m[1]!.split("|");
    const name = parts[0]!.trim();
    const args: string[] = [];
    const named: Record<string, string> = {};
    for (const p of parts.slice(1)) {
      const eq = p.indexOf("=");
      if (eq > 0 && /^\s*[\w -]+\s*$/.test(p.slice(0, eq))) named[p.slice(0, eq).trim()] = p.slice(eq + 1).trim();
      else args.push(p.trim());
    }
    out = out.slice(0, m.index) + (fn({ name, args, named }) ?? "") + out.slice(m.index + m[0].length);
  }
  throw new Error("Template rewriting did not finish");
}

/** Plain text: strips bold/italic quotes, HTML tags and entities, squashes whitespace. */
export function plain(s: string): string {
  return s
    .replace(/'{2,}/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The fields of the first `{{Infobox <kind>` in a page, as raw values (before
 * any template rewriting), keyed by field name.
 */
export function infobox(wikitext: string, kind: string): Record<string, string> {
  const start = wikitext.indexOf(`{{Infobox ${kind}`);
  if (start < 0) throw new Error(`No {{Infobox ${kind}}}`);
  return fieldsFrom(wikitext.slice(start));
}

/** Every call of a one-field-per-line template, e.g. {{Canadian first minister list}}, as field maps. */
export function templateCalls(wikitext: string, name: string): Record<string, string>[] {
  return wikitext
    .split(`{{${name}\n`)
    .slice(1)
    .map((chunk) => fieldsFrom(`{{${name}\n${chunk}`));
}

function fieldsFrom(text: string): Record<string, string> {
  // Line-based, because these templates are one field per line and a stray
  // unbalanced template in one field (it happens) shouldn't swallow the rest.
  // The call ends at the first line that is just "}}".
  const lines = text.replace(/<!--[\s\S]*?-->/g, "").split("\n").slice(1);
  const fields: Record<string, string> = {};
  let key: string | null = null;
  for (const line of lines) {
    if (/^\s*\}\}\s*$/.test(line)) break;
    const m = /^\s*\|\s*([\w ]+?)\s*=(.*)$/.exec(line);
    if (m) {
      key = m[1]!;
      fields[key] = m[2]!.trim();
    } else if (key) fields[key] += "\n" + line;
  }
  for (const k of Object.keys(fields)) fields[k] = fields[k]!.trim();
  return fields;
}

/** The rows of the first wikitable after `marker`, each as its raw text. */
export function tableRows(wikitext: string, marker: string): string[] {
  const at = wikitext.indexOf(marker);
  if (at < 0) throw new Error(`Marker not found: ${marker}`);
  const open = wikitext.indexOf("{|", at);
  const close = wikitext.indexOf("\n|}", open);
  return wikitext.slice(open, close).split(/\n\|-[^\n]*/).slice(1);
}

/**
 * Splits a table row into cells. Cells start with "|" or "!" at the start of a
 * line, and "||" or "!!" separate cells on one line. A cell's attributes
 * ("style=… | value") are dropped. `header` marks cells that began with "!".
 */
export function cells(row: string): { text: string; header: boolean }[] {
  const out: { text: string; header: boolean }[] = [];
  for (const line of row.split("\n")) {
    const first = line[0];
    if (first !== "|" && first !== "!") {
      if (out.length && line.trim()) out[out.length - 1]!.text += " " + line;
      continue;
    }
    const header = first === "!";
    for (let piece of line.slice(1).split(header ? /!!|\|\|/ : /\|\|/)) {
      // Drop an attribute prefix: `style="…" | value` (a single pipe, outside links).
      const attr = /^\s*[\w-]+\s*=\s*("[^"]*"|[^|]*?)\s*(?:[\w-]+\s*=\s*("[^"]*"|[^|]*?)\s*)*\|(?!\|)/.exec(piece);
      if (attr) piece = piece.slice(attr[0].length);
      out.push({ text: piece.trim(), header });
    }
  }
  return out;
}
