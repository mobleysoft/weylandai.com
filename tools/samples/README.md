Rockford sample packet (goal g031)

- Build from the repository root: node tools/samples/build-rockford-sample.mjs
- Requires Node >=22.13 for node:sqlite and weyland-subx-worker's installed dependencies. This run used Node 26.3.0 (PATH=/opt/homebrew/bin:$PATH).
- Input: tools/user-simulation/roles/rockford-A2.2-p29.pdf; output: assets/samples/rockford-schedule-packet.pdf.
- Real product calls: readPageFromTextLayer, writeDoorScheduleEntries, assembleSubmittalPackage; sovereign-pdf writes the product pages and pdf-lib merges them with the actual source sheet.
- Worker-only calls supplied locally: env.DB.prepare(...).bind(...).first/all/run use in-memory SQLite; env.UPLOADS.get uses the fixture bytes. These are the only fakes; the PDF reader, persistence transform, and generator are unchanged implementations.
- Product route: POST /api/hardware-schedule/session/:sessionId/submittal-pdf in src/routes/subx-workspace.js. It requires the referenced Section 08 71 00 for a full packet; this deliberately schedule-only sample calls its assembler directly, without any hardware components or cut sheets.
- At HEAD b3ce3b2, unpaid PDF downloads return HTTP 402, with no SAMPLE helper. The assembler now has an explicit sample option. Payment behavior is unchanged.
- SAMPLE bands extend the visible pages above the original content, including the negative-origin source sheet; they do not cover any source rows.
- Five pages: cover (1), contents (2), 65 extracted doors with source page 1 / zero-based rows 0-64 (3-4), original A2.2 sheet (5; page 29 in the whole project fixture).
- Producer: WeylandAI SubX (sovereign-pdf + pdf-lib). Creator: WeylandAI SubX. Artifact timestamp from date: 2026-10-09T17:50:59Z.
- Wording change 1: submittal-transforms.js summary, Hardware Sets -> Hardware Groups.
- Wording change 2: submittal-transforms.js fallback heading, Hardware Set -> Hardware Group.
- subx-app.html already used hardware group(s) at this HEAD (eceb04f); no remaining hardware set(s) copy in either requested file. Identifiers, API fields, classes, and keys were not renamed.
- Validation at 2026-10-09T17:51:32Z (date -u): cd weyland-subx-worker; PATH=/opt/homebrew/bin:$PATH node --test: 71 pass, 0 fail, 0 skipped. Includes all-page SAMPLE visibility and all 65 door-to-row traces.
- Poppler rendered all five pages for visual review; pdftotext confirmed five SAMPLE labels. Text-source git diff --check passed (the PDF itself contains binary streams).
- Homepage unchanged: index.html:2058 button, index.html:4367 fetch of the same PDF path.
- Mac: Chromium cannot launch in this sandbox; check SEE A SAMPLE PACKET in the browser, then commit/deploy. No git writes were performed here.
