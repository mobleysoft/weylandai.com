// Probe 3 = app desktop/phone; probe 5 = homepage desktop/phone.
// Use the same real-browser assertions as the matrix. No renderer patching or synthetic input.
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export function runControlsProbes(where) {
  const evidence = { base: process.env.WEYLAND_BASE_URL || 'https://weylandai.com', measuredAt: new Date().toISOString(), paths: {} };
  for (const kind of ['desktop', 'phone']) {
    const id = `sightx-controls-${where}-${kind}`;
    const started = Date.now();
    const run = spawnSync(process.execPath, [fileURLToPath(new URL(`../journeys/${id}.mjs`, import.meta.url))], { env: process.env, encoding: 'utf8' });
    process.stderr.write(run.stdout || ''); process.stderr.write(run.stderr || '');
    let report = null;
    // Do not accidentally report a stale previous success when the browser or imports fail.
    try {
      const path = new URL(`../reports/journey-${id}-latest.json`, import.meta.url);
      if (statSync(path).mtimeMs >= started) report = JSON.parse(readFileSync(path, 'utf8'));
    } catch (_) {}
    evidence.paths[kind] = { exitCode: run.status, report, error: run.error?.message || null };
    if (run.status !== 0) process.exitCode = 1;
  }
  console.log(JSON.stringify(evidence, null, 2));
}
