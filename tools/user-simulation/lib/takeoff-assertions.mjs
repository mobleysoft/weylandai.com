// Judge the displayed counts against the actual uploaded schedule rows.
export function takeoffCounts(tiles, rows) {
  const counts = new Map((tiles || []).map(({ label, value }) => [
    String(label).trim().toLowerCase().replace(/\s*\(machine-read\)\s*$/, ''), value,
  ]));
  const integer = value => /^\d+$/.test(String(value ?? '').trim()) ? Number(value) : null;
  const doors = integer(counts.get('door rows') ?? counts.get('doors'));
  const groups = integer(counts.get('hardware groups'));
  const expectedGroups = new Set((rows || []).map(row => String(row.group || '').trim()).filter(value => value && value !== '-' && value !== '—' && value !== '(empty)')).size;
  return { ok: Array.isArray(rows) && rows.length > 0 && doors === rows.length && groups === expectedGroups,
    doors, displayed_groups: groups, actual_rows: rows?.length ?? 0, actual_groups: expectedGroups };
}
