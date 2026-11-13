/**
 * Every riding's 2025 result with all candidates, as a static file,
 * /data/riding-results.json. The ridings explorer loads it on first use so
 * the page itself stays light.
 */
import type { APIRoute } from "astro";
import { clientResults } from "../../widgets/ridings-explorer/data";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(clientResults()), { headers: { "Content-Type": "application/json" } });
