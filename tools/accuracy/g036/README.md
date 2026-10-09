# g036: clear failures for unexpected journey API answers

`apiAnswer()` and `Journey.api()` report HTTP errors, failed requests, malformed JSON,
missing fields, explicit API failure flags and invalid shapes as named failed checks.
The helper returns null so a journey can close the current page and continue with the
remaining sets. Unexpected exceptions still include the journey source line in the receipt.

The ten-set SightX journey validates door entries, source rows, row counts, layout type
and tagged plan coordinates before using them. A schematic layout must supply a nonempty
`no_plan_reason`. Its original row, door, tag, camera, schematic disclosure and movement
assertions remain in place. A planned model with no tagged door fails the original tag
assertion and skips the dependent walk.

## Fixture verification

Run:

```sh
node --test tools/user-simulation/api-answer.test.mjs tools/user-simulation/journey-api-regression.test.mjs tools/user-simulation/estimator-assertions.test.mjs
```

All 42 tests pass: 9 pure helper tests, 22 fixtures that execute the actual SightX journey
and `Journey.run()`, and 11 existing estimator assertions. The journey fixtures cover
the ten published model structures, including both schematic sets. Failure fixtures
verify continuation through the other nine sets, page/context/browser closure, cleanup,
both timestamped and latest JSON receipts, and exit status 1.

These fixtures use browser I/O stubs and create no browser, network request or account.
Their successful model cases verify the harness contract; production browser rendering
and movement remain separate acceptance runs.
