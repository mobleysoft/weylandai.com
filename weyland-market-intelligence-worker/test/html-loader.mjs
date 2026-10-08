// Lets node --test import the .html pages the way Wrangler's Text rule does
// (default export: the file's text).
import { readFileSync } from "node:fs";
export async function load(url, context, next) {
  if (url.endsWith(".html")) return { format: "module", shortCircuit: true, source: "export default " + JSON.stringify(readFileSync(new URL(url), "utf8")) + ";" };
  return next(url, context);
}
