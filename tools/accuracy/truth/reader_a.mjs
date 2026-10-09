// tools/accuracy/truth/reader_a.mjs
//
// Reader A: the production text-layer reader, called exactly as SubX's server calls it
// (weyland-subx-worker/src/lib/text-layer-read.js readPageFromDoc, which runs
// assets/client-ocr-src/schedule-text-layer.mjs). Imported read-only; its output is mapped to the
// harness's common row shape here and nowhere else:
//   door:  { mark, location, size, width_inches, height_inches, pair, door_type, frame_type, material, fire_rating, hardware_group, y }
//   group: { set, name, heading, doors: [], items: [{ qty, uom, description, catalog, finish, manufacturer }], continued }
import { readPageFromDoc } from "../../../weyland-subx-worker/src/lib/text-layer-read.js";

export async function readA(pdf, pageNumber, type) {
  let r;
  try { r = await readPageFromDoc(pdf, pageNumber, type); } catch (e) { return { error: String(e && e.message || e).slice(0, 200) }; }
  if (!r) return { no_text: true };
  if (r.schedule_type !== type) return {};
  if (type === "door_schedule") {
    const doors = ((r.result && r.result.doors) || []).map((d) => ({
      mark: d.door_number,
      location: d.remarks && /Room: (.*)$/.test(d.remarks) ? d.remarks.match(/Room: (.*)$/)[1] : null,
      size: d.size || null,
      width_inches: d.width_inches ?? null, height_inches: d.height_inches ?? null, pair: !!d.pair,
      door_type: d.door_type || null, frame_type: d.frame_type || null, material: d.material_code || null,
      fire_rating: d.fire_rating || null, hardware_group: d.hardware_group || null, y: d.source_y ?? null,
    }));
    return { doors };
  }
  const groups = ((r.result && r.result.hardware_groups) || []).map((g) => {
    const num = String(g.group_number || "");
    return {
      set: num === "(continued)" ? "(continued)" : num.toUpperCase(),
      name: g.group_name || null,
      heading: [g.group_number, g.group_name].filter(Boolean).join(" "),
      doors: (g.assigned_doors || []).map((x) => String(x).toUpperCase()),
      continued: num === "(continued)" || !!g.continued,
      items: (g.components || []).map((c) => ({
        qty: c.quantity_printed ?? c.quantity ?? null, uom: c.uom || null,
        description: c.description || c.component_type || null,
        catalog: c.catalog_number || c.model_number || null,
        finish: c.finish || null,
        manufacturer: c.manufacturer_code || c.manufacturer || null,
      })),
    };
  });
  return { groups };
}
