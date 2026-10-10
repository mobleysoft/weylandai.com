// A landscape plan, two room labels, three tags, one announced scale.
const item = (str, x, y, h = 10) => ({ str, x, y, h, w: str.length * h * 0.6 });
const title = (sheet, text) => [item(sheet, 2800, 2070, 28), item(text, 2700, 2000, 20)];
export const pages = [
  { page: 1, width: 3024, height: 2160, items: [
    ...title("A-101", "FIRST FLOOR PLAN"),
    item("OFFICE", 500, 500), item("101", 509, 519),
    item("LOBBY", 1200, 800), item("102", 1206, 819),
    item("101A", 600, 600), item("101B", 800, 600), item("102A", 1300, 900),
    item('SCALE: 1/8" = 1\'-0"', 500, 1700),
  ] },
  { page: 2, width: 3024, height: 2160, items: title("A-601", "DOOR SCHEDULE") },
];
export const doors = ["101A", "101B", "102A"].map((mark, i) => ({
  mark, page: 2, y: 300 + i * 20, location: null, size: "3'-0\" x 7'-0\"",
  width_inches: 36, height_inches: 84, pair: false, door_type: "A", material: "HM",
  frame_type: "F1", hardware_group: String(i + 1), fire_rating: "20 MIN",
}));
export const truth = { sha16: "0123456789abcdef", label: "Synthetic plan", source_url: null,
  page_count: 2, tier: "agreed", rows_total: 3 };
