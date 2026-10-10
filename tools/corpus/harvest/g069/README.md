# g069 evidence: harvest round N (2026-10-10)

Dry run against the committed round 3 state (round.json, round_number 3, finished 2026-10-09T09:49:52Z, stopped_at_round_cap true, 426 URLs remaining):

    node tools/corpus/harvest/harvest.mjs --round 4 --cap-bytes 1000000000 --from-remaining --dry-run > tools/corpus/harvest/g069/dry-run-round4.txt

Exit 0, no request sent, git status unchanged apart from the code. Last line of dry-run-round4.txt:

    dry run: round 4, 426 files queued from round 3's 426 work-left URLs; round cap 1000000000 bytes, per-file cap 150000000 bytes; nothing fetched, nothing written

The 426 files are all missouri_oa_fmdc plans, specs, bid documents and addenda (no bid tab, no IFB), across 92 OA project ids (18 file names carry no project id), e.g. U1503-01 9 files, C2406-01 6, F2307-01 9, C2403-01 5, T2421-01 2, X2506-01 1.

The sets named in the goal, from manifest.jsonl:

| set | round 2 (cap) | round 3 | in round 4 queue |
|---|---|---|---|
| R2516-01 | line 948 Final specs: Round cap, not fetched | line 1641 downloaded, sha 5648348d1c7752dd | no (done) |
| R2416-01 | line 953 Final Bid Plans: Round cap, not fetched | line 1645 downloaded, sha b1b8acd2eeadb18f | no (done) |
| X2410-01 | line 959 Final Bid Plans: Round cap, not fetched | line 1650 downloaded, sha 70ab5446590e40cc | no (done) |
| T2423-01 | line 965 Final Plans: Round cap, not fetched | line 1655 downloaded, sha 977cec6301f40433 | no (done) |
| C2403-01 | line 1630 Final Bid Plans: Round cap, not fetched | line 2199 Round cap, not fetched | yes, 5 files |

R2516, R2416, X2410 and T2423 were round 2's work left and round 3 fetched them, so they are already in the truth harness's 598 sets. Round 4 is C2403-01 and the other 91 projects in dry-run-round4.txt.

Tests: node --test tools/corpus/harvest/round-plan.test.mjs (7 pass). They run harvest.mjs over a fake round directory (HARVEST_ROOT) whose work-left queue points at a local HTTP server, and check four things:
- the dry run sends no request and writes nothing;
- a real round 4 keeps robots Disallow, the round cap on Content-Length, the manifest rows and round.json state (round3.json preserved);
- a second start is refused;
- --round3 refuses as before.
