// weyland-docs-worker/src/lib/safety-hazards.js
//
// SafetyX's reading of a flagged line (2026-10-08). The word list in
// classify.js decides WHICH lines matter; this decides WHAT each one is:
//   hazardOf(line)  -> the OSHA construction hazard it describes (the Focus
//                      Four first: falls, struck-by, caught-in/between,
//                      electrocution), with the 29 CFR 1926 standard to look at.
//   outcomeOf(line) -> what happened to the person, if anyone was hurt, and
//                      what 29 CFR 1904.7 says about recording it. A hint for
//                      the person who keeps the OSHA 300 log, never the call.
// Both are word rules, so they say which words decided them.

// Order matters: a falling OBJECT is struck-by, so it is tested before falls.
export const HAZARDS = [
  { key: "struck", label: "Struck-by", focusFour: true, cfr: "29 CFR 1926.451(h) (falling objects), 1926.600-.602 (vehicles, equipment), 1926.100 (head protection)",
    re: /\b(?:struck(?: by)?|falling objects?|dropped|(?:fell|slid|tipped) (?:from|off|over) (?:the |a |an )?(?:cart|rack|shelf|truck|lift|forklift|dolly|table|pallet|stack|bench)|unsecured (?:load|door|slab|frame|material|panel)|swing(?:ing)? load|forklift|backing (?:up|vehicle)|hit by|flying (?:debris|particles?|objects?))\b/i },
  { key: "fall", label: "Falls", focusFour: true, cfr: "29 CFR 1926.501-.503 (fall protection), 1926.1053 (ladders), 1926 Subpart L (scaffolds)",
    re: /\b(?:fall protection|fall arrest|fell|falls?|falling|guard ?rails?|harness|tie[- ]?off|tied off|lanyard|ladders?|scaffold\w*|leading edge|roof edge|floor (?:hole|opening)|stair (?:opening|well)|unprotected (?:edge|side|opening)s?|lost (?:his |her |their )?balance|trigger height|aerial lift|scissor lift)\b/i },
  { key: "caught", label: "Caught-in/between", focusFour: true, cfr: "29 CFR 1926.300(b) (guarding), 1926 Subpart P (excavations)",
    re: /\b(?:caught (?:in|between|on)|pinch(?:ed|ing)?(?: point)?|crush\w*|trench\w*|cave[- ]?in|rotating|unguarded|amputat\w*|between (?:the )?(?:door|frame|leaf) and)\b/i },
  { key: "electrical", label: "Electrocution", focusFour: true, cfr: "29 CFR 1926.416-.417 (electrical work, lockout and tagging), 1926 Subpart K",
    re: /\b(?:electrocut\w*|electrical (?:hazards?|shock|panels?|boxes|cords?|work)|energi[sz]ed|live (?:wire|circuit|conductor)s?|shock(?:ed)?|lock ?out|tag ?out|loto|power lines?|exposed wir\w*|arc flash|ground fault|gfci)\b/i },
  { key: "lifting", label: "Lifting and material handling", focusFour: false, cfr: "OSH Act § 5(a)(1) (general duty); 29 CFR 1926.250 (material storage)",
    re: /\b(?:lift(?:ing|ed)?|strain(?:ed)?|sprain(?:ed)?|back (?:injury|pain|strain)|carry(?:ing)?|overexert\w*|manual handling|awkward posture)\b/i },
  { key: "cuts", label: "Cuts and lacerations", focusFour: false, cfr: "29 CFR 1926.95 (protective equipment, including hand protection)",
    re: /\b(?:cut (?:(?:his|her|their|a|the|left|right) )*(?:hand|finger|thumb|palm|arm|wrist|leg|head|face)|cut\b(?= on)|lacerat\w*|sharp edges?|stitches|sutures?|puncture\w*)\b/i },
  { key: "ppe", label: "Personal protective equipment", focusFour: false, cfr: "29 CFR 1926.95 (PPE), 1926.100 (head), 1926.101 (hearing), 1926.102 (eye and face)",
    re: /\b(?:ppe|safety glasses|eye protection|goggles|face shields?|hard ?hats?|gloves|hearing protection|ear ?plugs|respirators?|hi[- ]?vis\w*|safety vests?|not wearing)\b/i },
  { key: "tools", label: "Hand and power tools", focusFour: false, cfr: "29 CFR 1926.300-.307",
    re: /\b(?:drill\w*|saws?|grinder\w*|nail ?guns?|powder[- ]actuated|power tools?|extension cords?|guards? removed|blades?|mag drill)\b/i },
  { key: "silica", label: "Silica and dust", focusFour: false, cfr: "29 CFR 1926.1153 (respirable crystalline silica)",
    re: /\b(?:silica|dust\w*|cor(?:e|ing) drill\w*|coring|grinding (?:concrete|masonry|block)|cutting (?:concrete|block|masonry))\b/i },
  { key: "fire", label: "Fire and hot work", focusFour: false, cfr: "29 CFR 1926.150 (fire protection), 1926.352 (fire prevention in welding and cutting)",
    re: /\b(?:fires?|hot work|weld\w*|torch\w*|flammable|extinguishers?|burn(?:ed|s|t)?)\b/i },
  { key: "housekeeping", label: "Housekeeping and access", focusFour: false, cfr: "29 CFR 1926.25 (housekeeping), 1926.34 (means of egress)",
    re: /\b(?:housekeeping|debris|trip(?:ping)? hazards?|clutter\w*|blocked (?:exit|egress|corridor|stair)s?|slip(?:ped|pery)?|wet floors?|cords? across)\b/i },
];
export const OTHER = { key: "other", label: "Other", focusFour: false, cfr: "" };
export const HAZARD_BY_KEY = Object.fromEntries([...HAZARDS, OTHER].map((h) => [h.key, h]));

export function hazardOf(line) {
  const s = String(line || "");
  for (const h of HAZARDS) {
    const m = s.match(h.re);
    if (m) return { key: h.key, label: h.label, focusFour: h.focusFour, cfr: h.cfr, because: m[0] };
  }
  return { key: OTHER.key, label: OTHER.label, focusFour: false, cfr: "", because: null };
}

// From most to least serious; the first rule that matches decides.
const OUTCOMES = [
  { outcome: "death", recordable: "yes", re: /\b(?:died|death|fatal(?:ity|ly)?|deceased)\b/i,
    why: "A work-related death is recordable (29 CFR 1904.7(b)(2)) and must be reported to OSHA within 8 hours (1904.39)." },
  { outcome: "severe", recordable: "yes", re: /\b(?:hospitali[sz]ed|admitted to (?:the )?hospital|in-?patient|amputat\w*|loss of (?:an )?eye)\b/i,
    why: "In-patient hospitalization, an amputation or loss of an eye must be reported to OSHA within 24 hours (29 CFR 1904.39); the case is recordable." },
  { outcome: "days_away", recordable: "yes", re: /\b(?:days? away|lost[- ]time|off work|missed (?:work|\w+ days?)|could not return to work|out of work)\b/i,
    why: "Days away from work make the case recordable (29 CFR 1904.7(b)(3)); count calendar days, capped at 180." },
  { outcome: "restricted", recordable: "yes", re: /\b(?:restricted (?:duty|work)|light duty|modified duty|job transfer|transferred to another job)\b/i,
    why: "Restricted work or a job transfer makes the case recordable (29 CFR 1904.7(b)(4))." },
  { outcome: "medical", recordable: "yes", re: /\b(?:prescri\w*|stitches|sutures?|staples|medical treatment|physical therapy|fractur\w*|broken (?:bone|arm|leg|wrist|finger|ankle)|loss of consciousness|lost consciousness|passed out|concussion|rigid splint|cast)\b/i,
    why: "Medical treatment beyond first aid, a fracture or loss of consciousness makes the case recordable (29 CFR 1904.7(b)(5)-(7))." },
  { outcome: "first_aid", recordable: "no", re: /\b(?:first[- ]aid|band-?aids?|bandage\w*|ice pack|butterfly|non-?prescription|over[- ]the[- ]counter|cleaned the wound|returned to work)\b/i,
    why: "First aid only is not recordable (29 CFR 1904.7(b)(5)(ii) lists what counts as first aid)." },
  { outcome: "near_miss", recordable: "no", re: /\b(?:near[- ]?miss|close call|no injur\w*|nobody (?:was )?(?:hurt|injured)|no one (?:was )?(?:hurt|injured))\b/i,
    why: "No one was hurt: nothing to record, but a near miss is worth a corrective action." },
  { outcome: "injury", recordable: "check", re: /\b(?:injur\w*|hurt|cut|lacerat\w*|strain(?:ed)?|sprain(?:ed)?|bruis\w*|burn(?:ed|s|t)?|struck (?:his|her|their)|clinic|emergency room|doctor)\b/i,
    why: "Someone was hurt. Whether it is recordable depends on the treatment and time lost (29 CFR 1904.7): record it if it went beyond first aid." },
];
export const OUTCOME_LABEL = { death: "Death", severe: "Hospitalized / amputation / eye loss", days_away: "Days away from work", restricted: "Restricted work / job transfer", medical: "Medical treatment beyond first aid", first_aid: "First aid only", near_miss: "Near miss / no injury", injury: "Injury, treatment not stated" };

export function outcomeOf(line) {
  const s = String(line || "");
  for (const o of OUTCOMES) {
    const m = s.match(o.re);
    if (m) return { outcome: o.outcome, label: OUTCOME_LABEL[o.outcome], recordable: o.recordable, why: o.why, because: m[0] };
  }
  return null;
}

/** A flagged line with what it is. */
export function readFlag(f) {
  return { ...f, hazard: hazardOf(f.line), outcome: outcomeOf(f.line) };
}

/**
 * Trends over a person's reports: [{ id, project, date, flagged: [{line}] }]
 * -> by hazard, by month (YYYY-MM), by project, Focus Four share, injuries.
 */
export function trendsOf(reports) {
  const byHazard = {}, byMonth = {}, byProject = {};
  let total = 0, focus = 0, injuries = 0, recordableHints = 0, nearMisses = 0;
  for (const r of reports) {
    const month = /^\d{4}-\d{2}/.test(r.date || "") ? r.date.slice(0, 7) : null;
    for (const f of r.flagged || []) {
      const h = hazardOf(f.line), o = outcomeOf(f.line);
      total++;
      if (h.focusFour) focus++;
      byHazard[h.key] = (byHazard[h.key] || 0) + 1;
      if (month) { byMonth[month] = byMonth[month] || {}; byMonth[month][h.key] = (byMonth[month][h.key] || 0) + 1; }
      const p = r.project || "(no project name)";
      byProject[p] = (byProject[p] || 0) + 1;
      if (o && !["near_miss"].includes(o.outcome)) injuries++;
      if (o && o.recordable === "yes") recordableHints++;
      if (o && o.outcome === "near_miss") nearMisses++;
    }
  }
  const hazards = Object.entries(byHazard).sort((a, b) => b[1] - a[1]).map(([key, n]) => ({ key, label: HAZARD_BY_KEY[key].label, focusFour: HAZARD_BY_KEY[key].focusFour, n }));
  const months = Object.keys(byMonth).sort().map((m) => ({ month: m, total: Object.values(byMonth[m]).reduce((a, b) => a + b, 0), byHazard: byMonth[m] }));
  const projects = Object.entries(byProject).sort((a, b) => b[1] - a[1]).map(([project, n]) => ({ project, n }));
  return { reports: reports.length, total, focusFour: focus, focusFourShare: total ? Math.round((100 * focus) / total) : 0, injuries, recordableHints, nearMisses, hazards, months, projects };
}
