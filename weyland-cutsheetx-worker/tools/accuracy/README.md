# Matcher checks

Run the SQL regressions with Node 22.13 or later:

```sh
node --test weyland-cutsheetx-worker/tools/accuracy/matcher-regressions.test.mjs
```

The fixtures run the actual `matchProductFromDb` SQL in an in-memory SQLite database using
the D1 method interface. They cover trade preference, exact matches before prefixes,
complete model names, unknown manufacturers, numeric and SQL wildcard guards, and stable
tie ordering. They do not require credentials or update D1.

On 2026-10-06, an independent local replay of Claude's saved D1 snapshot reproduced the
matcher improvement across the existing 320-product sample, seven spellings per product,
and ten negative lines (2,250 lines):

| Matcher | Accepted product lines | Recall | Precision | Wrong products | False positives |
|---|---:|---:|---:|---:|---:|
| Committed parser v2 matcher | 2,193 / 2,240 | 97.90% | 99.86% | 3 | 0 / 10 |
| Reviewed matcher with trade fallback | 2,221 / 2,240 | 99.15% | 99.95% | 1 | 0 / 10 |

These are local replay results, not a new live API run. The committed sample and live
harness remain in [`../../../tools/accuracy`](../../../tools/accuracy). The replay used
the current parser and the original sampled products against the saved 10,508-product
snapshot. It improved 28 lines without creating a new wrong result in that sample.
The existing harness accepts a different product ID when its normalized model equals the
expected model; each row above includes one such accepted line. It does not prove that an
ambiguous model-only line selected the correct manufacturer.
Manufacturer/model matching queries averaged 1.37 per positive line (maximum six), and
3.4 per negative line (maximum nine). Those counts exclude document and catalogue-page
lookups performed by the API after a match.

Remaining parser issues from that replay:

- `1705 5-LITE SSB` loses `1705` as a presumed quantity, then matches `5-LITE GBG` by
  prefix. This is the one remaining wrong product in the sample.
- Models starting with `F16`, `F12`, `C`, or a number can lose their first token to
  schedule mark or quantity detection: `F16 Over 8" thru 12" face`, `C AND CK 7'2"`,
  `6 PNL TEXT FG`, and `10 X 1 1/2”` are examples.
- Commas inside catalogue model names are treated as column separators or removed:
  `9500 X 2525 B, C, W` and `Flood Shield Side, Neoprene` still have misses.

These parser cases precede the matcher handoff and need separate parser work. The matcher
change preserves its guards against guessing products from free-form words or unknown
manufacturers and labels matches from another trade with reduced confidence.
