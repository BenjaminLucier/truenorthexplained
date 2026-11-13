/**
 * Cards for the "Who does what?" sorter. Facts follow
 * content/learn/05-federalism/division-of-powers.en.md and the Constitution Act, 1867,
 * ss. 91–95 (https://laws-lois.justice.gc.ca/eng/const/page-3.html).
 */
export type Answer = "federal" | "provincial" | "shared";
export type CardSet = "federalism" | "1867";

export interface Card {
  id: string;
  label: string;
  answer: Answer;
  /** Section reference as shown, e.g. "s. 91(15)". */
  section: string;
  /** Anchor on the Justice Laws page, e.g. "s-91". */
  anchor: string;
  why: string;
  sets: CardSet[];
}

export const cards: Card[] = [
  {
    id: "banking",
    label: "Banking",
    answer: "federal",
    section: "s. 91(15)",
    anchor: "s-91",
    why: "Banking, incorporating banks and issuing paper money are on the federal list.",
    sets: ["federalism", "1867"],
  },
  {
    id: "criminal-law",
    label: "Criminal law",
    answer: "federal",
    section: "s. 91(27)",
    anchor: "s-91",
    why: "Parliament makes criminal law and procedure, which is why the Criminal Code is one federal law. Setting up the criminal courts is left to the provinces.",
    sets: ["federalism", "1867"],
  },
  {
    id: "justice",
    label: "Running the courts",
    answer: "provincial",
    section: "s. 92(14)",
    anchor: "s-92",
    why: "The administration of justice is provincial: setting up and running provincial courts, and civil procedure. Most criminal cases are prosecuted by provincial Crown attorneys.",
    sets: ["federalism", "1867"],
  },
  {
    id: "hospitals",
    label: "Hospitals",
    answer: "provincial",
    section: "s. 92(7)",
    anchor: "s-92",
    why: "Hospitals, asylums and charities are on the provincial list (except marine hospitals).",
    sets: ["federalism", "1867"],
  },
  {
    id: "schools",
    label: "Schools",
    answer: "provincial",
    section: "s. 93",
    anchor: "s-93",
    why: "Provinces make laws about education, subject to protections for certain denominational (religious) school rights.",
    sets: ["federalism"],
  },
  {
    id: "drivers-licences",
    label: "Driver's licences",
    answer: "provincial",
    section: "s. 92(13) and (16)",
    anchor: "s-92",
    why: "Highways and driving are local matters, so licensing drivers is provincial. Impaired driving is also a federal crime: a subject can have both a federal and a provincial side.",
    sets: ["federalism"],
  },
  {
    id: "defence",
    label: "National defence",
    answer: "federal",
    section: "s. 91(7)",
    anchor: "s-91",
    why: "Militia, military and naval service, and defence are federal.",
    sets: ["federalism", "1867"],
  },
  {
    id: "immigration",
    label: "Immigration",
    answer: "shared",
    section: "s. 95",
    anchor: "s-95",
    why: "Both Parliament and the provinces can make laws about immigration. A provincial law applies only as long as it isn't inconsistent with a federal one.",
    sets: ["federalism"],
  },
  {
    id: "agriculture",
    label: "Agriculture",
    answer: "shared",
    section: "s. 95",
    anchor: "s-95",
    why: "Agriculture is a concurrent power: both orders can legislate, and the federal law wins a conflict.",
    sets: ["federalism", "1867"],
  },
  {
    id: "marriage-divorce",
    label: "Marriage and divorce",
    answer: "federal",
    section: "s. 91(26)",
    anchor: "s-91",
    why: "Who can marry, and divorce, are federal.",
    sets: ["federalism", "1867"],
  },
  {
    id: "solemnization",
    label: "Solemnization of marriage",
    answer: "provincial",
    section: "s. 92(12)",
    anchor: "s-92",
    why: "The ceremony itself is provincial: marriage licences and who can officiate.",
    sets: ["federalism", "1867"],
  },
  {
    id: "municipalities",
    label: "Municipalities",
    answer: "provincial",
    section: "s. 92(8)",
    anchor: "s-92",
    why: "Municipal institutions are on the provincial list. Cities and towns get their powers from provincial laws.",
    sets: ["federalism", "1867"],
  },
  {
    id: "postal",
    label: "Postal service",
    answer: "federal",
    section: "s. 91(5)",
    anchor: "s-91",
    why: "The postal service is on the federal list.",
    sets: ["federalism", "1867"],
  },
  {
    id: "resources",
    label: "Natural resources",
    answer: "provincial",
    section: "s. 92A",
    anchor: "s-92A",
    why: "Provinces control non-renewable natural resources, forestry and electricity (added in 1982). They can regulate exports to other provinces, but a federal law wins a conflict.",
    sets: ["federalism"],
  },
  {
    id: "pensions",
    label: "Old age pensions",
    answer: "shared",
    section: "s. 94A",
    anchor: "s-94A",
    why: "Parliament may make laws about old age pensions, but no federal law affects a provincial one. It's the one case where provincial law wins, which is why the Quebec Pension Plan runs alongside the Canada Pension Plan.",
    sets: ["federalism"],
  },
  {
    id: "employment-insurance",
    label: "Employment insurance",
    answer: "federal",
    section: "s. 91(2A)",
    anchor: "s-91",
    why: "Unemployment insurance was added to the federal list by a constitutional amendment in 1940.",
    sets: ["federalism"],
  },
  {
    id: "penitentiaries",
    label: "Penitentiaries",
    answer: "federal",
    section: "s. 91(28)",
    anchor: "s-91",
    why: "Penitentiaries are federal. In practice, people sentenced to two years or more serve their time there.",
    sets: ["federalism"],
  },
  {
    id: "prisons",
    label: "Provincial jails",
    answer: "provincial",
    section: "s. 92(6)",
    anchor: "s-92",
    why: "Public and reformatory prisons are provincial. In practice, sentences under two years are served in provincial jails.",
    sets: ["federalism"],
  },
  {
    id: "currency",
    label: "Currency",
    answer: "federal",
    section: "s. 91(14)",
    anchor: "s-91",
    why: "Currency and coinage are federal.",
    sets: ["1867"],
  },
  {
    id: "property-civil-rights",
    label: "Contracts and property",
    answer: "provincial",
    section: "s. 92(13)",
    anchor: "s-92",
    why: "Property and civil rights in the province. \"Civil rights\" here means private legal relationships such as contracts and property, not civil liberties.",
    sets: ["1867"],
  },
];

export const columns: { id: Answer; label: string; hint: string }[] = [
  { id: "federal", label: "Federal", hint: "Parliament" },
  { id: "provincial", label: "Provincial", hint: "Provincial legislatures" },
  { id: "shared", label: "Shared", hint: "Both can make laws" },
];

export function cardsFor(set: string | undefined): Card[] {
  const key: CardSet = set === "1867" ? "1867" : "federalism";
  return cards.filter((c) => c.sets.includes(key));
}
