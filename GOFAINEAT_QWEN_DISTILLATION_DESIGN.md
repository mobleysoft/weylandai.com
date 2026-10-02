# Distilling WeylandAI's Qwen usage for connection-constrained field use

Compiled 2026-10-01. Goal stated by John: a user loads the WeylandAI site/app
while connected, then walks onto a job site with no signal, and the
extraction features (door-schedule reading, price-book extraction) keep
working — "distilled into gofaineat" so this is sovereign, not a thinner
network call.

## Real current state (verified this pass, not assumed)

- **No PWA shell exists today.** `grep` across `src/` and `index.html` found
  zero service worker, zero `manifest.json`, zero `navigator.serviceWorker`
  reference — only a `theme-color` meta tag. "Loaded on the phone, works
  offline later" requires building this from scratch regardless of which
  inference approach gets picked below. This is a real prerequisite, not
  optional plumbing.
- **The real Qwen3-8B model is 4.7GB** (`~/models/qwen3-8b/Qwen3-8B-Q4_K_M.gguf`,
  the exact model `qwen-bridge.js` calls). There is no version of "cache this
  on a phone" that works — mobile browser Cache Storage quotas and realistic
  cellular pre-download budgets are nowhere near 4.7GB. Full-fidelity
  Qwen3-8B cannot run on-device. This has to be said plainly rather than
  hand-waved past.
- **OCR is already proven portable and is small.** This session confirmed
  (real Node.js test) that `tesseract-wasm` + the bundled `eng-traineddata.bin`
  run correctly outside the Workers runtime. Total asset weight:
  `tesseract-core.wasm` (1.8M) + `eng-traineddata.bin` (3.9M) +
  `pdfium.wasm` (3.8M) + `squoosh-png.wasm` (180K) ≈ **9.5MB**. This is
  genuinely cacheable in a PWA and needs no distillation — it already runs
  client-side.
- **The gofaineat cascade pattern's own design doc already flags the real
  limit here**, and it's worth taking seriously rather than re-litigating:
  `GOFAINEAT_CASCADE_DESIGN_PATTERN.md`'s "Door-schedule extraction" section
  states OCR and table-row-structuring "may not decompose into a
  gofaineat-style classifier at all... worth treating as its own research
  question." That was written honestly in advance of this exercise, and
  today's Phase 6 pre-flight test (cross-column transposition on a real
  multi-finish price matrix, found in a parallel track this session) is a
  live example of exactly how open-ended this step still is.

## The actual distinction that matters: cascade decomposition vs. model distillation

"Distilling Qwen into gofaineat" has been used loosely to mean two
genuinely different things, and conflating them is why this looked solvable
at a glance when it isn't, fully, yet:

1. **Cascade decomposition** (the real gofaineat pattern): replace one
   open-ended LLM call with a chain of narrow, enumerable classifiers,
   GA-trained against a reviewed bootstrap corpus. This works when the
   *decision* is genuinely classifiable — finite named outputs, reviewable
   input space.
2. **Model distillation** (classical ML sense, also named and endorsed in
   the cascade doc's own "traced upstream from the frontier model" section):
   train a *small student model* to reproduce a large teacher's behavior on
   one bounded task, then actually run that small model, standalone, with
   no cascade and no classifier menu — because the task itself is still
   open-ended generation/extraction, just narrower in scope than "be a
   general assistant."

Door-schedule and price-book extraction are **extraction tasks over
noisy, variable-shape text** — the output is structured JSON with open
string/number fields, not a pick from a fixed named menu. That is route 2,
not route 1, for the core "read this row" step. Route 1 (true gofaineat
cascade classifiers) genuinely fits one specific *sub-problem* inside price
extraction, found during this investigation — see below.

## A real classifier-shaped sub-problem found inside price extraction

Today's Phase 6 test's actual failure mode was **cross-column
transposition**: the LLM correctly reads a model number and correctly reads
a price, but assigns the price to the wrong finish-code column in a
multi-finish price matrix. Reframed narrowly, "which column does this price
token belong to" is a genuinely small, enumerable, positionally-grounded
decision — the real OCR layout already carries column index, X-coordinate
bucket, and nearest-header-above as features, and the output is "column 1
of N" for a bounded, known N. That is enumerable and reviewable in the
sense the cascade doc requires. **This is a legitimate first real gofaineat
pilot to build** for this product — it directly fixes a bug just found,
independent of the offline question, and is worth building regardless of
the phone/PWA timeline.

What it does NOT replace: the free-text parts (reading the model number
itself, handling OCR noise, deciding whether a row has a price at all) stay
open-ended extraction. The cascade pattern narrows the *dangerous* part of
the failure, not the whole pipeline.

## Recommended real plan, phased by what's actually buildable

**Phase A — ship what already works offline, no new model work (small, real, do first):**
Build the PWA shell (manifest, service worker, asset precache) and put the
already-proven-portable OCR stack (9.5MB) behind it. A user who loaded the
app gets working OCR — pixels to raw text — fully offline today. This alone
is real, shippable progress toward the stated goal, with zero AI-distillation
risk.

**Phase B — build the column-assignment gofaineat (real cascade win, fixes today's bug):**
Follow the proven pilot process (bootstrap corpus via the live Qwen3-8B
bridge while still connected, 100% human/AI review, GA training) for the
narrow "which finish column does this price belong to" classifier. This
runs fully offline once trained (it's a small rule-set/network, not a
live model) and directly fixes the transposition bug independent of
anything else in this doc.

**Phase C — the honest hard part: a genuinely small on-device model for the
remaining open-ended extraction, via real distillation (not shrinking):**
Pick a model in the realistic phone/PWA weight class (quantized ~0.5B–1.5B
param range, roughly 300–900MB int4 — still a meaningfully large PWA asset,
requiring explicit user opt-in to a one-time download while connected, not
a silent page-load fetch) runnable via an in-browser inference runtime
(e.g. WebLLM/MLC-LLM or a llama.cpp WASM build — the same portability
pattern already proven for tesseract). Generate a labeled training corpus
using the real Qwen3-8B as teacher (point it at real anonymized door
schedules and price-book pages, capture its correct outputs), then
fine-tune/distill the small student on that narrow task only — not a
general assistant, a single-purpose extractor. This is real, standard,
well-understood ML work, but it is a genuinely separate build from the
GA-pilot tooling used for Phases A/B: it needs a fine-tuning pipeline and
an eval harness, not the cascade GA trainer. Scope and cost this as its
own project before committing to a timeline.

**Phase D — graceful degradation, not false parity:**
Design the product to be honest about the gap between Phase C's small
on-device model and the full Qwen3-8B: simple, common cases (clean single-
price rows, standard finish codes) get handled on-device; anything the
small model flags low-confidence gets queued locally and submitted for
full Qwen3-8B processing the next time connectivity returns. This is the
real, shippable version of "works offline" — not full LLM-quality
extraction with zero signal, which is not achievable at phone-class compute
and storage budgets and should not be promised as such.

## What this can't do

- It cannot put the real, currently-deployed Qwen3-8B on a phone. 4.7GB is
  not a PWA-cacheable asset under any realistic connectivity assumption.
- A phone-class distilled model (Phase C) will not match Qwen3-8B's
  extraction accuracy, especially on messy, unusual-layout pages — expect
  a real accuracy gap, mitigated only by Phase D's queue-when-reconnected
  fallback, not eliminated.
- The gofaineat GA-cascade pattern, as designed, cannot absorb the whole
  extraction task — only the genuinely classifier-shaped sub-decisions
  inside it (Phase B is the one found so far). Calling the eventual small
  on-device model in Phase C "a gofaineat" would repeat the exact mistake
  this pattern's own founding doc already named and rejected ("a general
  model call with a new name... doesn't reduce the actual dependency") —
  it should be named and tracked as model distillation, a different real
  technique, not folded into gofaineat terminology just because both start
  from the same teacher model.

## Suggested next concrete step

Build Phase A (PWA shell + offline OCR) first — it's small, already
de-risked by this session's portability test, and delivers real value on
its own. Scope Phase B as the next real gofaineat pilot build (follows the
exact proven process from `security_posture_severity`). Treat Phase C as a
separate, larger initiative requiring its own go/no-go decision — don't
start it opportunistically inside other work.
