/**
 * The riding boundaries as a static file, /data/ridings.topo.json, for the
 * ridings explorer's "find my riding" button. It's fetched only when a reader
 * asks, and the point-in-polygon test runs in their browser.
 *
 * Only the district number is kept per riding; names come from the results.
 */
import type { APIRoute } from "astro";
import topo from "../../data/geo/ridings.topo.json";

type Geometry = { properties?: { fed: number } & Record<string, unknown> };

export const GET: APIRoute = () => {
  const ridings = topo.objects.ridings as unknown as { geometries: Geometry[] };
  const slim = {
    ...topo,
    objects: {
      ridings: {
        ...ridings,
        geometries: ridings.geometries.map((g) => ({ ...g, properties: { fed: g.properties!.fed } })),
      },
    },
  };
  return new Response(JSON.stringify(slim), { headers: { "Content-Type": "application/json" } });
};
