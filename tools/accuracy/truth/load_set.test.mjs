// Compare real before/after truth_run outputs, retaining byte-level key/order checks.
// TRUTH_BEFORE=<dir> TRUTH_AFTER=<dir> node --test tools/accuracy/truth/load_set.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const before = process.env.TRUTH_BEFORE, after = process.env.TRUTH_AFTER;
const skip = !before || !after ? "set TRUTH_BEFORE and TRUTH_AFTER to the measured truth_run output directories" : false;
for (const sha of ["7478006f7fd5b43c", "43a1f0db3f7ff345"]) {
  test(sha + ": loader refactor keeps non-timing truth bytes identical", { skip }, () => {
    const read = (dir) => readFileSync(join(dir, sha + ".json"), "utf8")
      .replace(/^\s*"(?:ms|generated_at)":.*\n/gm, "");
    assert.equal(read(before), read(after));
  });
}
test("loader refactor keeps the disagreement queue byte-identical", { skip }, () => {
  assert.deepEqual(readFileSync(join(before, "queue.jsonl")), readFileSync(join(after, "queue.jsonl")));
});
