// Synthetic T2421-class geometry, not text extracted from the missing harvest PDF.
// One building: schedule p.15; 33 distinct tags on p.12 A-100.
const item = (str, x, y, h = 12) => ({ str, x, y, h, w: str.length * h * 0.5, rot: 0 });
const sheet = (page, number, title, labels) => ({ page, width: 2592, height: 1728, items: [
  item(number, 2350, 1630, 30), item(title, 2300, 1500, 18),
  ...labels.map((s, i) => item(s, 2350, 950 + i * 30)),
] });

export function singleBuilding(planLabels = [], scheduleLabels = []) {
  const plan = sheet(12, 'A-100', 'FLOOR PLAN', planLabels);
  const schedule = sheet(15, 'A-600', 'DOOR SCHEDULE', scheduleLabels);
  const rows = Array.from({ length: 33 }, (_, i) => ({ page: 15, mark: `${101 + i}A`,
    y: 200 + i * 24, width_inches: 36, height_inches: 84 }));
  rows.forEach((row, i) => {
    plan.items.push(item(row.mark, 250 + (i % 6) * 300, 250 + Math.floor(i / 6) * 180));
    schedule.items.push(item(row.mark, 200, row.y));
  });
  return { pages: [plan, schedule], rows };
}
