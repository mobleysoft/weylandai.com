# Rockford schedule-only sample

Build the sample from the repository root with:

```sh
node tools/samples/build-rockford-sample.mjs
```

The builder uses SubX's real text-layer reader, persistence transform, and packet assembler. Only D1 and R2 are replaced with local in-memory adapters. The source is `tools/user-simulation/roles/rockford-A2.2-p29.pdf`; the generated artifact is `assets/samples/rockford-schedule-packet.pdf`.

The six-page packet contains a cover, transmittal, contents, a 65-row extracted door schedule with source traces, and the original schedule sheet. Because this fixture has no hardware specification or catalog pages, the transmittal explicitly says compliance is not verified. Every page is labeled **SAMPLE - SCHEDULE ONLY - NOT FOR CONSTRUCTION**.

The fixture is covered by `weyland-subx-worker/test/rockford-sample.test.mjs`, which checks the page order, disclaimer, sample labels, and all 65 row traces. The full SubX worker suite passed with 235 tests on 2026-10-11.
