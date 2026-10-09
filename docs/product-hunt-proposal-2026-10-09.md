# Product Hunt: a proposed launch date, 2026-10-09

A proposal for John to accept or move. Nothing is scheduled or submitted on Product Hunt by this document.

## Proposed date

**Tuesday, October 20, 2026, at 12:01 a.m. Pacific** (the Product Hunt day starts then; Tuesday through Thursday launches see the most traffic, and Monday and Friday the least).

Fallback: **Thursday, October 22, 2026**, if any gate below is still open on Friday, October 16.

## Why not sooner

The launch sends first-time visitors straight into the free path the estimator audit found fragile on 2026-10-09 (docs/estimator-audit-rockford-2026-10-09.md): rows that took 3 minutes to show, "{}" errors on a busy server, no price where the packet is refused. Those were fixed and deployed the same day (mobleysoft/weylandai.com PR 76); they need a few days of live use and one more measured pass before a launch day's traffic.

## Gates (each checked on the Friday before)

1. `node tools/user-simulation/run-journeys.mjs --passes 3` green for all 23 journeys against production (the Mac's GPU run).
2. `node tools/accuracy/schedule_read_accuracy.mjs` at 95% rows and 95% fields on all five documents, no page read failing (passed 2026-10-09: docs/cloud-status.md).
3. `node tools/accuracy/packet_coverage.mjs`: every held item cited on Rockford and Berryessa (passed 2026-10-09: 36/37 and 10/10, the one miss not held).
4. Every product on sale passes its audit (tools/accuracy/doc_tools_audit.mjs and product_audit_*_tools.mjs), or shows NOT SOLD YET with the reason.
5. A second first-time estimator run on a bid set it has never seen (not Rockford), through the free path in a real browser, ending at the $100 offer without an error; the verdict and numbers written to docs/.
6. The WeylandAI Building grade (tools/bidset/grade.mjs) passes all six GC checks on the vector set.

## What the launch shows

The $100 first submittal on a full-size public bid set: upload Rockford's 30-page addendum, SubX finds the door schedule (A2.2) and Section 08 71 00 itself, reads 65 doors and 110 items in seconds, and builds a packet that cites a catalogue page for every item the catalogue holds and lists the rest with what is needed. Free to try; the packet is the $100 output. The tagline and gallery are drafted from measured numbers only (docs/cloud-status.md), never from claims the audits have not confirmed.

## Who does what

- John: accept or move the date; write the maker comment.
- Mac session: the gate 1 run and the gate 5 browser run, measured.
- Cloud session: gates 2 to 4 and 6, the gallery images from the live product, fixes for anything a gate finds.
