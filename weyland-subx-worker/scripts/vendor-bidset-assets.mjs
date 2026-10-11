// Offline: installed pdf-lib 1.17.1, MIT; shared reader stays byte-for-byte in
// sync (including future titleBlocks fixes). Run after editing shared readers.
import { copyFileSync } from 'node:fs';
const copy = (from, to) => copyFileSync(new URL(from, import.meta.url), new URL(to, import.meta.url));
for (const name of ['plan-read', 'building-scope']) copy('../../weyland-shared/' + name + '.js', '../assets/client-ocr/' + name + '.js.bin');
copy('../node_modules/pdf-lib/dist/pdf-lib.esm.min.js', '../assets/client-ocr/pdf-lib.mjs.bin');
copy('../node_modules/pdf-lib/LICENSE.md', '../assets/pdf-lib-LICENSE.md');
for (const name of ['bidset-cut', 'source-pages', 'schedule-grid-extraction-client', 'schedule-workspace']) copy('../assets/client-ocr-src/' + name + '.mjs', '../assets/client-ocr/' + name + '.mjs.bin');
