import { describe, expect, it } from "vitest";
import { fillSeats, hemicycle, r2 } from "../../src/lib/hemicycle";

describe("hemicycle", () => {
  const cases: [total: number, rows: number][] = [
    [343, 8],
    [338, 9],
    [105, 5],
    [7, 3],
    [1, 1],
  ];

  for (const [total, rows] of cases) {
    describe(`${total} seats in ${rows} rows`, () => {
      const h = hemicycle(total, rows);

      it("places exactly `total` seats", () => {
        expect(h.seats).toHaveLength(total);
      });

      it("puts each seat on its row's arc, inside the drawing", () => {
        for (const s of h.seats) {
          const radius = rows === 1 ? h.inner : h.inner + ((h.outer - h.inner) * s.row) / (rows - 1);
          expect(Math.hypot(s.x - h.cx, s.y - h.cy)).toBeCloseTo(radius, 6);
          expect(s.y).toBeLessThanOrEqual(h.cy + 1e-9);
          expect(s.x - h.r).toBeGreaterThanOrEqual(0);
          expect(s.x + h.r).toBeLessThanOrEqual(h.width);
          expect(s.y - h.r).toBeGreaterThanOrEqual(0);
        }
      });

      it("orders seats left to right by angle", () => {
        for (let i = 1; i < h.seats.length; i++) expect(h.seats[i]!.angle).toBeGreaterThanOrEqual(h.seats[i - 1]!.angle);
      });

      it("never overlaps two seats", () => {
        for (let i = 0; i < h.seats.length; i++)
          for (let j = i + 1; j < h.seats.length; j++) {
            const a = h.seats[i]!;
            const b = h.seats[j]!;
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * h.r);
          }
      });

      if (total % 2 === 1) {
        it("puts the middle seat on the centre line, where the majority line goes", () => {
          const middle = h.seats[(total - 1) / 2]!;
          expect(middle.x).toBeCloseTo(h.cx, 9);
          expect(middle.angle).toBeCloseTo(Math.PI / 2, 9);
        });
      }
    });
  }

  it("gives outer rows more seats than inner ones", () => {
    const h = hemicycle(343, 8);
    const perRow = Array.from({ length: 8 }, (_, row) => h.seats.filter((s) => s.row === row).length);
    for (let i = 1; i < perRow.length; i++) expect(perRow[i]).toBeGreaterThanOrEqual(perRow[i - 1]!);
  });
});

describe("fillSeats", () => {
  const layout = hemicycle(5, 1);
  it("assigns groups in order and fills the rest with the fallback", () => {
    expect(fillSeats(layout, [{ key: "a", count: 2 }, { key: "b", count: 1 }], "vacant")).toEqual(["a", "a", "b", "vacant", "vacant"]);
  });
  it("never returns more keys than seats", () => {
    expect(fillSeats(layout, [{ key: "a", count: 4 }, { key: "b", count: 4 }], "vacant")).toEqual(["a", "a", "a", "a", "b"]);
  });
});

describe("r2", () => {
  it("rounds to two decimals", () => {
    expect(r2(1.23456)).toBe(1.23);
    expect(r2(2.5)).toBe(2.5);
    expect(r2(-3.14159)).toBe(-3.14);
  });
});
