/**
 * One province's slice of the committed datasets, run through the pure
 * functions in src/lib/province-profile.ts. Build time only.
 *
 *   const p = provinceProfile("quebec");
 *   p.population.takeaway   // "Quebec has 21.7% of Canada's people and …"
 *
 * Sections whose data doesn't cover the province come back null (language,
 * equalization history for the territories, the riding list for a one-seat
 * territory), so the widget can leave them out.
 */
import { PROVINCES, population as quarterly, provinceResults, ridings, seatAllocation, winners, type ProvinceCode } from "../../lib/elections";
import { population as statcan, buildDate } from "../../lib/reference";
import { BASE_YEAR, provincePopulation, toReal, transfers } from "../../lib/money";
import { provinceGovernments } from "../../lib/election-history";
import { provinceFeatures, treatyFeatures, type TreatyProps } from "../../components/map/geo";
import languageData from "../../data/demographics/language.json";
import {
  averagePerPerson,
  codeForSlug,
  electionTakeaway,
  equalizationSummary,
  equalizationTakeaway,
  languageTakeaway,
  perPerson,
  populationShares,
  populationTakeaway,
  populationTrend,
  premiersTakeaway,
  ridingsTakeaway,
  voteShare,
  seatSources,
  sortParties,
  transfersTakeaway,
  treatiesTakeaway,
  treatyOverlaps,
  trendTakeaway,
  type RidingRow,
} from "../../lib/province-profile";

export function provinceProfile(slug: string) {
  const code = codeForSlug(slug);
  if (!code) throw new Error(`province-profile: unknown province or territory "${slug}"`);
  const info = PROVINCES[code];
  const name = info.en;

  // 1. Population and seats ------------------------------------------------
  const alloc = seatAllocation.provinces.find((a) => a.province === code);
  const pop = quarterly.provinces.find((p) => p.province === code);
  if (!alloc || !pop) throw new Error(`province-profile: no seats or population for ${code}`);
  const shares = populationShares({
    name,
    population: pop.population,
    canadaPopulation: quarterly.canada,
    seats: alloc.total,
    totalSeats: seatAllocation.total,
  });
  const series = statcan.estimates[slug] ?? [];
  const canadaSeries = statcan.estimates.canada ?? [];
  const trend = populationTrend(series, canadaSeries);
  const canadaByYear = new Map(canadaSeries.map((p) => [p.year, p.value]));

  // 2. 2025 election -------------------------------------------------------
  const result = provinceResults.find((r) => r.province === code);
  if (!result) throw new Error(`province-profile: no 2025 results for ${code}`);
  const parties = sortParties(result.parties);
  const ridingById = new Map(ridings.filter((r) => r.province === code).map((r) => [r.fed, r]));
  const ridingRows: (RidingRow & { renamed?: string; validVotes: number })[] = winners
    .filter((w) => w.province === code)
    .map((w) => {
      const r = ridingById.get(w.fed);
      if (!r) throw new Error(`province-profile: no riding ${w.fed}`);
      return {
        fed: w.fed,
        name: r.nameEn,
        renamed: r.currentName?.en,
        party: w.party,
        winner: w.winner,
        margin: w.margin,
        marginVotes: w.marginVotes,
        winnerShare: voteShare(r.candidates[0]?.votes ?? 0, r.validVotes),
        second: r.candidates[1]?.party,
        validVotes: r.validVotes,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en-CA"));

  // 3. Transfers -------------------------------------------------------------
  const L = transfers.latest;
  const all = L.provinces.map((r) => ({ ...perPerson(r), population: r.population, row: r }));
  const mine = all.find((r) => r.province === code);
  if (!mine) throw new Error(`province-profile: no transfers for ${code}`);
  const provincesOnly = L.provinces.filter((r) => !PROVINCES[r.province].territory);
  const provinceAvg = averagePerPerson(provincesOnly);
  const territoryAvg = averagePerPerson(L.provinces.filter((r) => PROVINCES[r.province].territory));
  const eqPaid = transfers.equalization.provinces[code];
  const eqYears = transfers.equalization.years;
  const equalization = eqPaid
    ? {
        years: eqYears,
        paid: eqPaid,
        /** Per person in BASE_YEAR dollars. */
        realPerPerson: eqYears.map((label, i) => {
          const m = eqPaid[i] ?? 0;
          if (!m) return 0;
          const y = Number(label.slice(0, 4));
          const people = provincePopulation(code, y);
          if (!people) throw new Error(`province-profile: no population for ${code} in ${y}`);
          return toReal(m * 1e6, y) / people;
        }),
        summary: equalizationSummary({ years: eqYears, paid: eqPaid }),
        takeaway: equalizationTakeaway(name, { years: eqYears, paid: eqPaid }),
      }
    : null;

  // 4. Premiers -------------------------------------------------------------
  const gov = provinceGovernments.find((p) => p.slug === slug);
  if (!gov) throw new Error(`province-profile: no premiers for ${slug}`);

  // 5. Treaties -------------------------------------------------------------
  const provinceFeature = provinceFeatures().find((f) => f.properties.slug === slug);
  if (!provinceFeature) throw new Error(`province-profile: no boundary for ${slug}`);
  const overlaps = treatyOverlaps<TreatyProps>(
    provinceFeature,
    treatyFeatures().map((f) => ({ feature: f, props: f.properties })),
  );

  // 6. Language ---------------------------------------------------------------
  const lang = languageData.series.find((s) => s.slug === slug) ?? null;
  const langCanada = languageData.series.find((s) => s.slug === "canada") ?? null;

  return {
    slug,
    code: code as ProvinceCode,
    name,
    territory: info.territory,
    population: {
      ...shares,
      refDate: quarterly.refDate,
      takeaway: populationTakeaway(shares),
      allocation: alloc,
      seatSources: seatSources(alloc, info.territory),
      trend,
      series,
      shareOf: (year: number, value: number) => {
        const c = canadaByYear.get(year);
        return c ? (100 * value) / c : null;
      },
      trendTakeaway: trend ? trendTakeaway(name, trend) : null,
    },
    election: {
      result,
      parties,
      takeaway: electionTakeaway(name, parties, result.seats),
      ridings: ridingRows,
      ridingsTakeaway: ridingRows.length > 1 ? ridingsTakeaway(ridingRows) : null,
    },
    transfers: {
      label: L.label,
      mine,
      all,
      provinceAvg,
      territoryAvg,
      takeaway: transfersTakeaway(name, info.territory, L.label, mine, provinceAvg.total),
      equalization,
      baseYear: BASE_YEAR,
    },
    premiers: {
      gov,
      takeaway: premiersTakeaway(name, info.territory, gov.terms, buildDate),
    },
    treaties: {
      ...overlaps,
      provinceFeature,
      takeaway: treatiesTakeaway(
        name,
        overlaps.treaties.map((t) => t.props.era),
        overlaps.covered,
      ),
    },
    language: lang
      ? { series: lang, canada: langCanada, takeaway: languageTakeaway(name, lang.points) }
      : null,
  };
}

export type ProvinceProfile = ReturnType<typeof provinceProfile>;
