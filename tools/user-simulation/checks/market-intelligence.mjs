// checks/market-intelligence.mjs
//
// PriceX/MarketX/CompX/WeatherX/ForecastX/GeoX - the 6 routes proxied
// verbatim (src/routes/market-intelligence-proxy.js) to the independently
// deployed weyland-market-intelligence-worker via a Service Binding. Both
// FRED-dependent routes (pricex/materials, marketx/trends) were
// documented broken (502, missing FRED_API_KEY) as of MICROSERVICES_PUSH.md
// - this check exists precisely so a change on EITHER side (a real fix,
// or a real regression) gets caught by a re-run instead of this report
// going stale. Confirmed live 2026-09-12 (this same day, by a later
// change than MICROSERVICES_PUSH.md - not something this harness did):
// the FRED dependency itself was removed per a direct sovereignty
// correction ("no dependency on any external party's service"). PriceX
// now returns real data from a different source; MarketX has no
// first-party replacement yet and openly self-reports
// `{"status":"not_yet_viable", detail: {message: "..."}}` (a real 501,
// not a silent failure) rather than either faking data or 502ing. This
// check classifies that as an honestly-disclosed gap, not a bug, and
// reads the real message out of the response instead of hardcoding a
// stale explanation that would go stale the next time this changes.
//
// None of these 6 routes require authentication (confirmed: the proxy
// module has no authenticate() call at all).

import { httpFetch, step, trim } from "../lib/http.mjs";

export const product = "PriceX / MarketX / CompX / WeatherX / ForecastX / GeoX (market-intelligence)";
export const slug = "market-intelligence";

const ROUTES = [
  { name: "PriceX materials", method: "GET", path: "/api/pricex/materials" },
  { name: "MarketX trends", method: "GET", path: "/api/marketx/trends" },
  { name: "CompX vendors", method: "GET", path: "/api/compx/vendors?q=door+hardware" },
  { name: "WeatherX delay-risk", method: "GET", path: "/api/weatherx/delay-risk?lat=34.05&lon=-118.24" },
  { name: "ForecastX project", method: "POST", path: "/api/forecastx/project", body: { contract_value: 500000, duration_months: 12 } },
  { name: "GeoX lookup", method: "GET", path: "/api/geox/lookup?address=" + encodeURIComponent("1600 Pennsylvania Ave NW, Washington, DC") },
];

export async function run({ log }) {
  const steps = [];
  const findings = [];

  for (const c of ROUTES) {
    const opts = { method: c.method };
    if (c.body) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(c.body);
    }
    const res = await httpFetch(c.path, opts);
    const ok = res.status === 200;
    // A route that honestly self-reports its own unavailability (rather
    // than 502ing or fabricating data) is a real, deliberate product
    // decision, not a bug - classify separately from a genuine failure.
    const isHonestlyDisclosedGap = !ok && res.json?.status === "not_yet_viable";

    steps.push(
      step(`${c.method} ${c.path} (${c.name})`, {
        method: c.method,
        path: c.path,
        status: res.status,
        ok: ok || isHonestlyDisclosedGap,
        detail: ok
          ? "real data returned"
          : isHonestlyDisclosedGap
            ? `honestly disclosed as unavailable: ${res.json?.detail?.message || trim(res.json, 150)}`
            : trim(res.json || res.text, 200),
        evidence: trim(res.json || res.text, 500),
      })
    );

    if (ok) {
      findings.push({ severity: "working", detail: `${c.name} is live and returning real data.` });
    } else if (isHonestlyDisclosedGap) {
      findings.push({
        severity: "gap",
        detail: `${c.name} openly reports itself as not-yet-viable rather than failing silently or faking data: "${res.json?.detail?.message || ""}"`,
      });
    } else {
      findings.push({ severity: "broken", detail: `${c.name} failed unexpectedly: status ${res.status}, body: ${trim(res.json || res.text, 250)}` });
    }
  }

  return {
    product,
    slug,
    entryPoints: {
      marketing: null,
      app: null,
      api: ROUTES.map((c) => `${c.method} ${c.path}`),
    },
    steps,
    findings,
  };
}
