// Components are materialized under set_id; older tables also use
// hardware_set_id. Delete both kinds before deleting their parent groups.
export function hardwareChildDeletes(schema, parentWhere) {
  const statements = [];
  for (const column of ["set_id", "hardware_set_id"]) {
    for (const table of Object.keys(schema).sort()) {
      if (["door_schedule_entries", "hardware_door_matrix"].includes(table) || !schema[table].includes(column)) continue;
      statements.push("DELETE FROM " + table + " WHERE " + column + " IN (SELECT id FROM hardware_sets WHERE " + parentWhere + ");");
    }
  }
  return statements;
}
