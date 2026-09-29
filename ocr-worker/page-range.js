// One-based page ranges; old callers still default to the first page.
export function pageRange(headers, documentPages) {
  const parse = (name, fallback) => {
    const raw = headers.get(name) ?? String(fallback);
    if (!/^[1-9]\d*$/.test(raw)) throw new Error(`Invalid ${name}`);
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) throw new Error(`Invalid ${name}`);
    return value;
  };
  const start = parse('X-Start-Page', 1);
  const count = parse('X-Total-Pages', 1);
  const maximum = parse('X-Max-Document-Pages', 100000);
  if (documentPages > maximum) throw new Error('Document exceeds requested page limit');
  if (start > documentPages) throw new Error('Start page exceeds document');
  return { start, end: Math.min(documentPages, start + count - 1), documentPages };
}
