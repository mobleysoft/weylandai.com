// weyland-huntx-worker/src/lib/trade-fit.js
//
// Which notices a door and hardware subcontractor should look at (2026-10-08).
// The index was 982 notices, 671 of them TxDOT road and bridge maintenance; a
// door sub had to read past them all to find the 50-odd building jobs. Each
// notice now carries a trade fit, from its own words (title, category, the
// source's description):
//
//   doors     names doors, door hardware, openings, entrances, storefronts,
//             access control or Division 08 - the sub's own scope.
//   building  building construction or renovation (schools, offices, fire
//             stations, interiors, additions): doors are usually in it.
//   signal    money released for building work that has not been bid yet
//             (California school facility funding): a lead to watch.
//   civil     roads, bridges, utilities, site and maintenance work with no
//             building in it.
//
// Words, not guesses: a notice with no building or door words from a source
// that only lists civil work (TxDOT) is civil; one from a building-only
// source (Illinois CDB) is building.

const DOOR_WORDS = /\b(door hardware|finish hardware|hardware (?:replacement|upgrades?)|doors?|openings?|entrances?|storefronts?|vestibules?|access control|card readers?|locks?(?:ets)?|locking|keying|egress|panic (?:hardware|devices?)|exit devices?|frames?|hollow metal|overhead (?:doors?|coiling)|rolling (?:doors?|grilles?)|division 0?8|08\s?[17]\d\s?\d\d|ada (?:upgrades?|improvements?|compliance)|accessib\w*|school safety|security upgrades?)\b/i;
const BUILDING_WORDS = /\b(buildings?|schools?|classrooms?|campus|library|librar(?:y|ies)|courthouse|fire (?:station|house)|firehouse|police|precinct|city hall|town hall|offices?|interiors?|renovat\w*|remodel\w*|moderniz\w*|additions?|alterations?|tenant improvements?|restrooms?|toilet rooms?|lockers?|gymnasium|auditorium|dormitor\w*|residence hall|housing|shelters?|hospital|clinic|health center|laborator\w*|facility|facilities|center|centre|museum|theater|visitor'?s? center|warehouse|maintenance (?:building|facility|garage)|garage|terminal|station house|construct(?:ion)? of|new construction|fit[- ]out|hvac|mechanical|electrical upgrades?|roof(?:ing)?|windows?|envelope|fa[cç]ade|stair(?:s|well)?|elevators?)\b/i;
const CIVIL_WORDS = /\b(highways?|bridges?|pavement|paving|resurfac\w*|seal ?coat|overlay|roadways?|streets?|sidewalks?|curbs?|striping|pavement markings?|traffic signals?|signals?|intersections?|interchanges?|guard ?rail|culverts?|drainage|storm ?water|sewers?|water mains?|pipelines?|dredg\w*|levees?|landscap\w*|mowing|routine maintenance project|material maintenance project|preventative maintenance|bridge (?:repair|rehab\w*)|rest area|right[- ]of[- ]way|grading|excavation|demolition only|utility|utilities|wastewater|treatment plant|reservoir|dam|seawall|bulkhead|parks? (?:improvements?|paths?)|trails?)\b/i;

const SOURCE_DEFAULT = { txdot: "civil", il_cdb: "building", ca_opsc: "signal", nyc_cityrecord: null, nyc_sca: "signal", la_ramp: null, de_mmp: null };

function textOf(opp) {
  let raw = opp.raw_data;
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch (_) { raw = null; } }
  const extra = raw ? [raw.additional_description_1, raw.description, raw.project_classification, raw.Program, raw.School_Name].filter(Boolean).join(" ") : "";
  return [opp.title, opp.category, extra].filter(Boolean).join(" ");
}

/**
 * @param {{source: string, title?: string, category?: string, raw_data?: object|string}} opp
 * @returns {{fit: "doors"|"building"|"signal"|"civil", why: string|null}}
 */
export function tradeFit(opp) {
  const t = textOf(opp);
  const door = t.match(DOOR_WORDS);
  const building = t.match(BUILDING_WORDS);
  const civil = t.match(CIVIL_WORDS);
  const dflt = SOURCE_DEFAULT[opp.source];
  // "Rest area" or "bridge" work that also names a building is building work;
  // a road job that mentions "signal" or "drainage" only is civil.
  if (door && !(civil && !building && dflt === "civil")) return { fit: "doors", why: door[0] };
  if (dflt === "signal") return { fit: "signal", why: "funding released" };
  if (building && !(civil && dflt === "civil" && !/\bbuildings?\b|\bfacilit/i.test(building[0]))) return { fit: "building", why: building[0] };
  if (civil) return { fit: "civil", why: civil[0] };
  if (dflt) return { fit: dflt, why: null };
  return { fit: "building", why: null };
}

/** "Bexar, TX" -> "TX"; "New York, NY" -> "NY"; else null. */
export function stateOf(location) {
  const m = String(location || "").match(/\b([A-Z]{2})\s*$/);
  return m ? m[1] : null;
}

// The fits shown for each filter value. "building" (the default) is every
// notice with building work in it, door scope or not.
export const FIT_FILTERS = Object.freeze({
  doors: ["doors"],
  building: ["doors", "building"],
  signal: ["signal"],
  civil: ["civil"],
  all: null,
});
