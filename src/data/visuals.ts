/**
 * Every map, chart and interactive on the site, in one list.
 *
 * Drives the /explore page, the "Try it" list in each module's sidebar, and the
 * home page showcase. When you add a widget to a page, add it here too.
 * `href` points at the widget's anchor (its name; repeats get -2, -3 …).
 */
import type * as icons from "lucide-static";

export type VisualKind = "map" | "chart" | "interactive" | "timeline" | "reference";

export interface Visual {
  title: string;
  text: string;
  href: string;
  icon: keyof typeof icons;
  kind: VisualKind;
  /** Show on the home page showcase. */
  featured?: boolean;
}

export const KINDS: Record<VisualKind, { title: string; text: string }> = {
  map: { title: "Maps", text: "Canada's provinces, territories and all 343 ridings." },
  chart: { title: "Parliament in numbers", text: "Who holds the seats, and how votes turn into them." },
  interactive: { title: "Step through it", text: "Explainers you click through, and a game to test yourself." },
  timeline: { title: "Timelines", text: "How we got here, one event at a time." },
  reference: { title: "People and population", text: "Every prime minister, governor general and census." },
};

export const VISUALS: Visual[] = [
  // Maps
  {
    title: "Provinces and territories map",
    text: "When each joined Confederation, its capital and population.",
    href: "/provinces#province-map",
    icon: "Map",
    kind: "map",
    featured: true,
  },
  {
    title: "Ridings explorer",
    text: "All 343 ridings: who won in 2025, by how much, and find your own.",
    href: "/ridings#ridings-explorer",
    icon: "MapPinned",
    kind: "map",
    featured: true,
  },
  {
    title: "Ridings won without a majority",
    text: "Where the winner got less than half the votes.",
    href: "/learn/elections/first-past-the-post#riding-share-map",
    icon: "Percent",
    kind: "map",
  },
  {
    title: "Treaty areas",
    text: "Historic and modern treaties, who made them, and the order they were signed.",
    href: "/learn/indigenous/treaties#treaty-map",
    icon: "Handshake",
    kind: "map",
  },

  // Parliament and elections
  {
    title: "House of Commons seating",
    text: "All 343 seats by party, and where the majority line falls.",
    href: "/learn/parliament/confidence#commons-seating",
    icon: "Armchair",
    kind: "chart",
    featured: true,
  },
  {
    title: "Votes vs seats",
    text: "Each party's share of the vote against its share of the seats.",
    href: "/learn/elections/first-past-the-post#votes-vs-seats",
    icon: "ChartColumn",
    kind: "chart",
  },
  {
    title: "Seats vs population",
    text: "Which provinces have more seats than their population alone would give.",
    href: "/learn/elections/election-day#seats-vs-population",
    icon: "Scale",
    kind: "chart",
  },
  {
    title: "The Senate's seats",
    text: "Seats by region, and senators by group.",
    href: "/learn/parliament/senate#senate-composition",
    icon: "Landmark",
    kind: "chart",
  },

  // Interactives
  {
    title: "How a bill becomes law",
    text: "Follow a bill through both chambers to royal assent.",
    href: "/learn/parliament/how-a-bill-becomes-law#bill-steps",
    icon: "ScrollText",
    kind: "interactive",
    featured: true,
  },
  {
    title: "From election to government",
    text: "From the writ to the first confidence vote, majority or minority.",
    href: "/learn/elections#election-to-government",
    icon: "Vote",
    kind: "interactive",
  },
  {
    title: "Who does what?",
    text: "Sort powers into federal, provincial or shared.",
    href: "/learn/federalism/division-of-powers#power-sorter",
    icon: "Shuffle",
    kind: "interactive",
    featured: true,
  },
  {
    title: "What does it take to change the Constitution?",
    text: "Pick a change and see which amending formula applies.",
    href: "/learn/constitution#amending-formula",
    icon: "PencilRuler",
    kind: "interactive",
  },
  {
    title: "As written vs as practised",
    text: "What the Constitution says, and what actually happens.",
    href: "/learn/constitution/conventions#conventions-toggle",
    icon: "ToggleRight",
    kind: "interactive",
  },
  {
    title: "Your Charter rights",
    text: "Every right, and who holds it.",
    href: "/learn/charter/your-rights#charter-rights",
    icon: "ShieldCheck",
    kind: "interactive",
  },
  {
    title: "The court system",
    text: "Which court hears what, and where appeals go.",
    href: "/learn/law/courts#court-map",
    icon: "Gavel",
    kind: "interactive",
  },

  // Timelines
  {
    title: "Canada, 1763 to today",
    text: "Key moments in how the country is governed.",
    href: "/timeline#timeline",
    icon: "History",
    kind: "timeline",
    featured: true,
  },
  {
    title: "Landmark Charter cases",
    text: "The Supreme Court decisions that shaped our rights.",
    href: "/learn/charter/landmark-cases#timeline",
    icon: "Gavel",
    kind: "timeline",
  },
  {
    title: "Uses of the notwithstanding clause",
    text: "Every use of section 33, by jurisdiction.",
    href: "/learn/charter/notwithstanding-clause#timeline",
    icon: "Ban",
    kind: "timeline",
  },

  // Reference
  {
    title: "Prime ministers",
    text: "All of them, coloured by party, from 1867 to today.",
    href: "/prime-ministers",
    icon: "Users",
    kind: "reference",
    featured: true,
  },
  {
    title: "Monarchs and governors general",
    text: "Canada's heads of state and their representatives.",
    href: "/governors-general",
    icon: "Crown",
    kind: "reference",
  },
  {
    title: "Demographics",
    text: "How Canada's population has grown and changed.",
    href: "/demographics",
    icon: "ChartLine",
    kind: "reference",
  },
  {
    title: "Urban and rural Canada",
    text: "From one Canadian in five living in a town or city to more than four in five.",
    href: "/demographics#demographics-3",
    icon: "Building2",
    kind: "reference",
  },
  {
    title: "Where immigrants were born",
    text: "Europe, Asia, the Americas and Africa, by when people arrived.",
    href: "/demographics#demographics-6",
    icon: "Globe",
    kind: "reference",
  },
  {
    title: "English, French and other languages",
    text: "Mother tongues since 1951 in Canada, Quebec, New Brunswick and Ontario.",
    href: "/demographics#demographics-7",
    icon: "Languages",
    kind: "reference",
  },
  {
    title: "First Nations, Métis and Inuit",
    text: "The Indigenous population at the last three censuses, and where people live.",
    href: "/demographics#demographics-8",
    icon: "Users",
    kind: "reference",
  },
  {
    title: "Population pyramid",
    text: "Canada by age and gender, now and 50 years ago.",
    href: "/demographics#demographics-9",
    icon: "ChartBarDecreasing",
    kind: "reference",
  },
];

/** Visuals living on pages of a module (e.g. "learn/parliament"). */
export const visualsForModule = (moduleId: string) =>
  VISUALS.filter((v) => v.href === `/${moduleId}` || v.href.startsWith(`/${moduleId}/`) || v.href.startsWith(`/${moduleId}#`));
