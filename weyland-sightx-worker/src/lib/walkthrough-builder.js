// weyland-sightx-worker/src/lib/walkthrough-builder.js
//
// Deterministic Guided Walkthrough builder (2026-10-07).
//
// Replaces the language-model script the walkthrough-preview route used
// to fetch (filmline-video-worker /api/generate -> mobley-venture-fleet-a
// story-treatment -> the Qwen bridge on John's Mac). That chain timed out
// under load and, when it did answer, wrote fiction about the building
// instead of a walk through it.
//
// This reads the visitor's own description for what a door-and-hardware
// walk needs - the spaces, the openings (doors, pairs, access points,
// door-schedule rows such as "101 HM 3070 HW-1") and the hardware and
// fire ratings named for them - and lays them out as an ordered walk:
// arrive, each space and each opening in the order the description gives
// them, end. Every scene says only what the description says; where it
// names no hardware for an opening, the scene says so and points at the
// hardware schedule instead of inventing any. No model, no network, no
// randomness: the same description always gives the same walkthrough, and
// two descriptions with different first clauses give two different titles
// (the title is the description's first clause).

const MAX_INPUT = 1000;
const MAX_SCENES = 16;          // filmline-video-worker /api/render accepts 1-24
const MAX_SCENE_CHARS = 690;    // /api/render: description <= 700
const MAX_TITLE_CHARS = 150;    // /api/render: title <= 160
const MAX_LOGLINE_CHARS = 590;  // /api/render: logline <= 600
const MAX_LISTED = 5;           // items named in a logline list before "and N more"

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, dozen: 12,
  single: 1, a: 1, an: 1,
};

// Words a qualifier run never crosses.
const STOPWORDS = new Set([
  "the", "with", "and", "or", "of", "in", "on", "at", "to", "for", "from", "into", "through",
  "then", "plus", "has", "have", "had", "is", "are", "was", "were", "be", "its", "their", "each",
  "every", "all", "both", "along", "off", "by", "near", "next", "past", "via", "including",
  "includes", "include", "featuring", "that", "which", "where", "there", "here", "this", "these",
  "those", "it", "they", "we", "our", "your", "my", "will", "would", "should", "must", "can",
  "need", "needs", "not", "no", "but", "so", "if", "as", "than", "also", "only", "just", "about",
  "over", "under", "between", "behind", "beside", "inside", "outside", "around", "up", "down",
]);

// Hardware a door-and-hardware walk stops for: [group label, pattern].
// Scenes show the words as the visitor wrote them.
const HARDWARE = [
  ["exit devices", /\b(?:(?:concealed|surface|vertical|rim|mortise)[- ]+)?(?:exit|panic|fire[- ]exit)[- ]+(?:devices?|hardware|bars?)\b|\b(?:crash|push|touch)[- ]?bars?\b/g],
  ["automatic operators", /\b(?:auto(?:matic)?|power(?:ed)?|ada|low[- ]energy)[- ]+(?:door[- ]+)?(?:operators?|openers?)\b|\b(?:push|wave|touchless)[- ]+(?:buttons?|plates?|actuators?)\b|\bactuators?\b/g],
  ["closers", /\b(?:(?:door|overhead|surface|concealed|parallel[- ]arm|hold[- ]open)[- ]+)?closers?\b/g],
  ["card readers", /\b(?:card|badge|fob|prox(?:imity)?)[- ]+readers?\b|\baccess[- ]+control\b|\bkey[- ]?pads?\b/g],
  ["electrified hardware", /\belectri(?:fied|c)[- ]+(?:strikes?|locks?|locksets?|hinges?|hardware|exit[- ]+devices?|trim)\b|\bmag(?:netic)?[- ]?locks?\b|\bmaglocks?\b|\bpower[- ]+transfers?\b/g],
  ["locksets", /\b(?:(?:mortise|cylindrical|lever|storeroom|classroom|office|passage|privacy|entrance|entry|intruder)[- ]+)?locksets?\b|\b(?:mortise|cylindrical)[- ]+locks?\b|\bdeadbolts?\b|\blevers?(?:[- ]+(?:handles?|trim))?\b|\blocks?\b/g],
  ["hinges", /\b(?:(?:continuous|butt|spring|ball[- ]bearing|heavy[- ]weight|geared)[- ]+)?hinges?\b|\bpivots?\b/g],
  ["protection plates", /\b(?:kick|armou?r|mop|push)[- ]?plates?\b/g],
  ["pulls", /\b(?:door[- ]+)?pulls\b|\bpull[- ]+(?:handles?|plates?)\b/g],
  ["stops and holders", /\b(?:wall|floor|overhead|door)[- ]+stops?\b|\b(?:magnetic[- ]+)?(?:door[- ]+)?holders?\b|\bhold[- ]?opens?\b/g],
  ["door position switches", /\bdoor[- ]+position[- ]+switch(?:es)?\b/g],
  ["flush bolts", /\bflush[- ]+bolts?\b/g],
  ["coordinators", /\bcoordinators?\b/g],
  ["astragals", /\bastragals?\b/g],
  ["seals", /\b(?:gasketing|gaskets?|weather[- ]?strip(?:ping)?|smoke[- ]+seals?|seals|(?:door[- ]+)?sweeps|thresholds?)\b/g],
  ["silencers", /\bsilencers?\b/g],
  ["cylinders", /\b(?:ic|interchangeable|sfic|lfic)[- ]+cores?\b|\bcylinders?\b/g],
  ["vision lites", /\bvision[- ]+(?:lites?|lights?|panels?|kits?)\b|\blouvers?\b/g],
];

const RATING = /\b(?:\d{1,3}|one|two|three|1-1\/2|1\.5)[- ]?(?:minutes?|mins?|hours?|hrs?)\b(?:[- ]+(?:fire[- ]+)?(?:rated|rating|label(?:ed|led)?))?/g;

// A door-schedule row: mark, material, optional size, optional hardware set
// ("101 HM 3070 HW-1", "D12 WD 3'-0\" x 7'-0\" SET 4").
const SCHEDULE_ROW = /\b([a-z]?\d{1,4}[a-z]?)\s+(hm|hmd|wd|wood|al|alum|aluminum|stl|steel|frp|gl|glass)\b(?:\s+(\d{4}|\d'?\s?-?\s?\d{1,2}"?\s*x\s*\d'?\s?-?\s?\d{1,2}"?))?(?:\s+(hw[- ]?\d+[a-z]?|set\s+\d+[a-z]?|hdw[- ]?\d+[a-z]?))?/g;

// Openings. A pair of doors is one opening with two leaves.
const OPENING = /\bpairs?\s+of\s+(?:[a-z0-9][\w\/-]*\s+){0,3}?doors\b|\bdouble[- ]+doors?\b|\b(?:doors?|doorways?|openings?|access[- ]+points?|gates?|pairs?)\b/g;

const SPACE = /\b(?:corridors?|hallways?|halls?|lobb(?:y|ies)|vestibules?|atri(?:um|a|ums)|foyers?|stair(?:well|way|case)?s?|entr(?:y|ies|ances?)|reception|rooms?|offices|suites?|areas?|zones?|wings?|bays?|docks?|terraces?|decks?|roof(?:top)?s?|courtyards?|plazas?|garages?|warehouses?|kitchens?|cafeterias?|classrooms?|restrooms?|bathrooms?|closets?|gym(?:nasium)?s?|auditori(?:um|a|ums)|librar(?:y|ies)|labs?|laborator(?:y|ies)|pharmac(?:y|ies)|nurses?'?\s+stations?|dorm(?:itor(?:y|ies))?s?|units?|apartments?|tenant\s+spaces?|lounges?|galler(?:y|ies)|chapels?|sanctuar(?:y|ies)|nurser(?:y|ies)|sally[- ]ports?|cells?)\b/g;

const LEVEL = /\b(?:(?:ground|first|second|third|fourth|fifth|sixth|top|lower|upper|main|1st|2nd|3rd|4th|5th|6th)[- ]+(?:floor|level|story|storey))\b|\bbasement\b|\bmezzanine\b|\b(?:level|floor)\s+\d+\b|\b(?:single|one|two|three|four|five|six|\d+)[- ]+stor(?:y|ey|ies|eys)\b/g;
const LEVEL_AT_START = new RegExp("^(?:" + LEVEL.source + ")");

function asciiLower(s) {
  // A-Z only, so every index lines up with the original text.
  return s.replace(/[A-Z]/g, (c) => c.toLowerCase());
}

function normalize(description) {
  return String(description || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INPUT);
}

function tokenize(lower) {
  const tokens = [];
  const re = /[a-z0-9][a-z0-9'\/-]*(?:[.,]\d+)*/g;
  let m;
  while ((m = re.exec(lower))) tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return tokens;
}

// Anything but whitespace between two words ends a phrase.
function hasBoundary(lower, from, to) {
  return /\S/.test(lower.slice(from, to));
}

function countOf(word) {
  if (word == null) return null;
  if (/^\d+$/.test(word)) return Number(word);
  return Object.prototype.hasOwnProperty.call(NUMBER_WORDS, word) ? NUMBER_WORDS[word] : null;
}

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function byStart(a, b) {
  return a.start - b.start;
}

function byLengthDesc(a, b) {
  return (b.end - b.start) - (a.end - a.start);
}

function collect(lower, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(lower))) {
    if (!m[0]) { re.lastIndex++; continue; }
    out.push({ start: m.index, end: m.index + m[0].length, groups: m.slice(1) });
  }
  return out;
}

// Extend a noun leftwards over its qualifiers ("eight hollow-metal doors",
// "a 90-minute stair door"): at most `max` words, never across
// punctuation, a stopword or a blocked span; a count word ends the run.
// Spans in `passable` (an opening's own rating or hardware words) are
// taken in whole.
function extendLeft(lower, tokens, start, blocked, max, passable = []) {
  let s = start;
  let count = null;
  let steps = 0;
  for (let k = tokens.findIndex((t) => t.end > start) - 1; k >= 0 && steps < max; k--) {
    const t = tokens[k];
    if (t.end > s) continue; // inside a span already taken in whole
    if (hasBoundary(lower, t.end, s)) break;
    const pass = passable.find((p) => overlaps(p, t));
    if (pass) { s = Math.min(s, pass.start); steps++; continue; }
    if (blocked.some((a) => overlaps(a, t))) break;
    const c = countOf(t.text);
    if (c != null) { s = t.start; count = c; break; }
    if (STOPWORDS.has(t.text)) break;
    s = t.start;
    steps++;
  }
  return { start: s, count };
}

// What follows a noun and belongs to it: "doors 101 through 108",
// "rooms 101-104", "room 101", "corridor 2B", "offices on the second floor".
function extendRight(lower, end) {
  const rest = lower.slice(end);
  const range = /^\s+(\d{1,4})[a-z]?\s*(?:-|to|through|thru)\s*(\d{1,4})[a-z]?\b/.exec(rest);
  if (range) {
    const span = Number(range[2]) - Number(range[1]) + 1;
    return { end: end + range[0].length, rangeCount: span >= 1 && span <= 200 ? span : null };
  }
  const code = /^\s+(?:[a-z]?\d{1,4}[a-z]?|[a-z])\b(?!['-])/.exec(rest);
  if (code && /\d/.test(code[0]) || code && /^\s+[a-z]$/.test(code[0]) && /^\s+[a-z]\s*(?:$|[,;:.)])/.test(rest)) {
    return { end: end + code[0].length, rangeCount: null };
  }
  const on = /^\s+(?:on|at|in)\s+(?:the\s+)?/.exec(rest);
  if (on) {
    const lv = LEVEL_AT_START.exec(rest.slice(on[0].length));
    if (lv) return { end: end + on[0].length + lv[0].length, rangeCount: null };
  }
  return { end, rangeCount: null };
}

function firstClauseEnd(lower) {
  const re = /:|;|\.(?=\s|$)|,(?!\d)|\s[-–—]\s|\s(?:with|including|featuring|where|which|that has|that have)\s/g;
  const m = re.exec(lower);
  return m ? m.index : lower.length;
}

function stripLeadingArticle(phrase) {
  return phrase.replace(/^(?:a|an|the)\s+/i, "");
}

function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 3);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:-]+$/, "") + "...";
}

// "Ground-floor corridor" mid-sentence -> "ground-floor corridor"; acronyms
// and capitals inside a word ("HM doors", "McKinley") stay as written.
function mid(phrase) {
  return /^[A-Z][a-z]/.test(phrase) && !/^[A-Z][a-z]*[A-Z]/.test(phrase)
    ? phrase[0].toLowerCase() + phrase.slice(1)
    : phrase;
}

function sentenceStart(phrase) {
  return phrase ? phrase[0].toUpperCase() + phrase.slice(1) : phrase;
}

const SMALL_WORDS = new Set(["a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from", "per", "via"]);
function titleCase(phrase) {
  return phrase.split(" ").map((word, i) => {
    if (!word) return word;
    if (/^(?:sq\.?\s?ft\.?|sqft|sf)$/i.test(word)) return "sq ft";
    if (/[A-Z]/.test(word.slice(1)) || /\d/.test(word)) return word;
    if (i > 0 && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
    return word.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join("-");
  }).join(" ");
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function capList(items, max, noun) {
  if (items.length <= max) return joinList(items);
  const more = items.length - max;
  return items.slice(0, max).join(", ") + " and " + more + " more " + noun + (more === 1 ? "" : "s");
}

// "the ground-floor corridor", but "room 101", "corridor 2B", "stair 2".
function withThe(phrase) {
  if (/^(?:the|this|that|our|your|their|its)\s/i.test(phrase)) return phrase;
  if (/\s(?:[a-z]?\d+[a-z]?|\d+\s*(?:-|to|through|thru)\s*\d+[a-z]?)$/i.test(phrase)) return phrase;
  return "the " + stripLeadingArticle(phrase);
}

function plural(phrase) {
  return /s$/i.test(phrase) ? phrase : phrase + "s";
}

// The opening as a stop: "one exit pair" -> "exit pair".
function stopText(opening) {
  if (opening.row) return opening.row;
  return mid(opening.count === 1 && !opening.each ? opening.text.replace(/^(?:one|a|an|single)\s+/i, "") : opening.text);
}

function spaceText(space) {
  return mid(space.text.replace(/^(?:one|a|an|single)\s+/i, ""));
}

function sentenceIndex(lower, pos) {
  let n = 0;
  const re = /[.;:!?](?=\s|$)/g;
  let m;
  while ((m = re.exec(lower)) && m.index < pos) n++;
  return n;
}

export function buildWalkthrough(description) {
  const text = normalize(description);
  const lower = asciiLower(text);
  const tokens = tokenize(lower);
  const original = (span) => text.slice(span.start, span.end).trim();

  // 1. Hardware and fire ratings: the most specific words, found first.
  const marks = [];
  const hardware = [];
  for (const [label, re] of HARDWARE) {
    for (const span of collect(lower, re)) {
      if (marks.some((a) => overlaps(a, span))) continue;
      marks.push(span);
      hardware.push({ start: span.start, end: span.end, label, text: original(span), kind: "hardware" });
    }
  }
  const ratings = [];
  for (const span of collect(lower, RATING)) {
    if (marks.some((a) => overlaps(a, span))) continue;
    marks.push(span);
    ratings.push({ start: span.start, end: span.end, text: original(span), kind: "rating" });
  }
  const tagged = [...hardware, ...ratings].sort(byStart);

  // 2. Openings: door-schedule rows first, then phrases with their
  //    qualifiers and counts. A rating or hardware word inside the phrase
  //    ("a 90-minute stair door") belongs to that opening.
  const openings = [];
  for (const row of collect(lower, SCHEDULE_ROW)) {
    if (marks.some((a) => overlaps(a, row))) continue;
    const g = text.slice(row.start, row.end).trim().split(/\s+/);
    const mark = g[0];
    const set = row.groups[3] ? text.slice(row.end - row.groups[3].length, row.end) : "";
    const body = text.slice(row.start + mark.length, row.end - set.length).trim();
    openings.push({ start: row.start, end: row.end, count: 1, pair: false, kind: "opening", text: original(row),
      row: "door " + mark + " (" + body + (set ? ", hardware set " + set : "") + ")", hardware: set ? ["hardware set " + set] : [], ratings: [] });
  }
  const openingCandidates = collect(lower, OPENING)
    .filter((noun) => !tagged.some((a) => overlaps(a, noun)) && !openings.some((a) => overlaps(a, noun)))
    .map((noun) => {
      const left = extendLeft(lower, tokens, noun.start, openings, 4, tagged);
      const right = extendRight(lower, noun.end);
      const nounText = lower.slice(noun.start, noun.end);
      const isPair = /^pairs?\s+of\b|^double[- ]|^pairs?$/.test(nounText);
      const isPlural = /s$/.test(nounText) && !/^double[- ]+doors$/.test(nounText);
      let count = left.count != null ? left.count : right.rangeCount;
      if (count == null && (!isPlural || /^double[- ]+doors$|^pair\s+of\b/.test(nounText))) count = 1;
      return { start: left.start, end: right.end, count, pair: isPair };
    })
    .sort(byLengthDesc);
  for (const o of openingCandidates) {
    if (openings.some((a) => overlaps(a, o))) continue;
    openings.push({ ...o, text: original(o), kind: "opening", hardware: [], ratings: [] });
  }
  openings.sort(byStart);
  for (const item of tagged) {
    const owner = openings.find((o) => overlaps(o, item));
    if (owner) { (item.kind === "hardware" ? owner.hardware : owner.ratings).push(item.text); item.attached = true; }
  }

  // 3. Spaces (corridors, lobbies, rooms, bays...), longest phrase first.
  const blocked = [...marks, ...openings];
  const spaceCandidates = collect(lower, SPACE)
    .filter((noun) => !blocked.some((a) => overlaps(a, noun)))
    .map((noun) => {
      const left = extendLeft(lower, tokens, noun.start, blocked, 3);
      const right = extendRight(lower, noun.end);
      return { start: left.start, end: right.end, head: lower.slice(noun.start, noun.end), rangeCount: right.rangeCount };
    })
    .sort(byLengthDesc);
  const spaces = [];
  for (const s of spaceCandidates) {
    if (blocked.some((a) => overlaps(a, s)) || spaces.some((a) => overlaps(a, s))) continue;
    // "the corridor of a medical office", "a lobby in an airport": the noun
    // after "of a / in an" names the building the walk is in, not a stop.
    if (/\b(?:of|in)\s+(?:a|an)\s+$/.test(lower.slice(Math.max(0, s.start - 8), s.start))) continue;
    spaces.push({ ...s, text: original(s), kind: "space", hardware: [], ratings: [] });
  }
  spaces.sort(byStart);

  // "classrooms 101 through 112 each with a wood door": one per room.
  for (const o of openings) {
    if (o.count !== 1 || o.row || !/\beach\s+(?:with|has|have|gets?)\s+$/.test(lower.slice(Math.max(0, o.start - 16), o.start))) continue;
    const room = spaces.filter((s) => s.end <= o.start && s.rangeCount).pop();
    if (room) { o.count = room.rangeCount; o.each = room; }
  }

  // 4. Floors and levels that are not already part of a space or opening.
  const levels = collect(lower, LEVEL)
    .filter((span) => ![...blocked, ...spaces].some((a) => overlaps(a, span)))
    .map((span) => ({ start: span.start, end: span.end, text: original(span), kind: "level" }));

  // Hardware and ratings outside an opening's own phrase belong to what
  // they follow in the same sentence ("doors with closers", "stair 2 with
  // exit devices"), or else to the next opening in it ("closers on the
  // corridor doors").
  const holders = [...openings, ...spaces].sort(byStart);
  for (const item of tagged) {
    if (item.attached) continue;
    const sentence = sentenceIndex(lower, item.start);
    const same = holders.filter((h) => sentenceIndex(lower, h.start) === sentence);
    const target = same.filter((h) => h.start < item.start).pop() || same.find((h) => h.kind === "opening" && h.start > item.start);
    if (target) {
      (item.kind === "hardware" ? target.hardware : target.ratings).push(item.text);
      item.attached = true;
    }
  }

  // The setting: the description's first clause, without its article.
  const clauseEnd = firstClauseEnd(lower);
  const subjectRaw = text.slice(0, clauseEnd).replace(/[\s,;:.\-–—]+$/, "").trim();
  const subject = /[a-z0-9]/i.test(subjectRaw) ? clip(stripLeadingArticle(subjectRaw), 110) : "space described";
  const subjectLower = asciiLower(subject);
  const subjectHasOpening = openings.some((o) => o.start < clauseEnd);

  const known = openings.filter((o) => o.count != null).reduce((n, o) => n + o.count, 0);
  const unknown = openings.some((o) => o.count == null);
  const totalText = openings.length
    ? (unknown ? Math.max(known, 2) + " or more openings" : known + " opening" + (known === 1 ? "" : "s"))
    : "";

  // Ordered stops: spaces, openings and floor changes as the description
  // gives them.
  const stops = [...spaces, ...openings, ...levels.filter((l) => l.start >= clauseEnd && !/stor(?:y|ey|ies|eys)$/i.test(l.text))]
    .sort(byStart);

  const scenes = [];
  scenes.push(subjectHasOpening
    ? "Start the walk: " + totalText + " to stop at."
    : "Arrive at " + withThe(mid(subject)) + "." + (totalText ? " " + sentenceStart(totalText) + " on this walk." : ""));

  const middle = [];
  let walked = false;
  for (const stop of stops) {
    const own = asciiLower(stop.text);
    const hw = (stop.hardware || []).filter((h) => !own.includes(asciiLower(h)));
    const rt = (stop.ratings || []).filter((r) => !own.includes(asciiLower(r)));
    if (stop.kind === "space") {
      const sameAsSetting = asciiLower(stripLeadingArticle(stop.text)) === subjectLower;
      const lines = [sameAsSetting
        ? "Walk the length of the " + stop.head.replace(/s$/, "") + "."
        : (walked ? "Continue to " : "Walk ") + withThe(spaceText(stop)) + "."];
      if (hw.length) lines.push("Hardware named here: " + joinList(hw) + ".");
      if (rt.length) lines.push("Rating: " + joinList(rt) + ".");
      middle.push(lines.join(" "));
      walked = true;
    } else if (stop.kind === "level") {
      middle.push("Go to " + withThe(mid(stop.text)) + ".");
    } else {
      const lines = [stop.each
        ? "Stop at the " + plural(stopText(stop).replace(/^(?:one|a|an|single)\s+/i, "")) + ", one for each of " + withThe(spaceText(stop.each)) + " (" + stop.count + ")."
        : "Stop at " + (stop.row ? stopText(stop) : withThe(stopText(stop))) + "."];
      if (stop.pair) lines.push(stop.count === 1 ? "A pair: two leaves." : "Pairs: two leaves each.");
      if (hw.length && !stop.row) lines.push("Hardware named: " + joinList(hw) + ".");
      if (rt.length) lines.push("Rating: " + joinList(rt) + ".");
      if (!stop.hardware.length) {
        lines.push(stop.count === 1
          ? "The description names no hardware for it; check it against the hardware schedule."
          : "The description names no hardware for them; check each against the hardware schedule.");
      }
      middle.push(lines.join(" "));
    }
  }
  if (!stops.length) {
    // Nothing recognised: walk the description's own clauses in order.
    text.slice(clauseEnd).split(/[,;:]|\.(?=\s|$)|\s(?:then|and then)\s/i)
      .map((c) => c.replace(/^\s*(?:with|including|featuring|and|then)\s+/i, "").trim())
      .filter((c) => c.split(/\s+/).length >= 2)
      .forEach((c) => middle.push("Next: " + c + "."));
  }
  if (middle.length > MAX_SCENES - 2) {
    const keepN = MAX_SCENES - 3;
    const keep = middle.slice(0, keepN);
    if (stops.length) {
      const rest = stops.slice(keepN);
      const restSpaces = rest.filter((s) => s.kind === "space").map(spaceText);
      const restOpenings = rest.filter((s) => s.kind === "opening");
      const parts = [];
      if (restSpaces.length) parts.push(capList(restSpaces, 6, "space"));
      if (restOpenings.length) {
        const n = restOpenings.reduce((k, o) => k + (o.count || 1), 0);
        const kinds = {};
        for (const o of restOpenings) { const k = o.row ? "schedule rows" : plural(stopText(o).replace(/^(?:one|a|an|single|\d+|two|three|four|five|six|seven|eight|nine|ten)\s+/i, "")); kinds[k] = (kinds[k] || 0) + (o.count || 1); }
        parts.push(n + " more opening" + (n === 1 ? "" : "s") + " (" + Object.entries(kinds).map(([k, c]) => c + " " + k).join(", ") + ")");
      }
      keep.push("Also on this walk: " + parts.join("; ") + ".");
    } else {
      keep.push("And " + (middle.length - keepN) + " more notes from the description.");
    }
    middle.length = 0;
    middle.push(...keep);
  }
  scenes.push(...middle);

  const loose = hardware.filter((h) => !h.attached).map((h) => h.text);
  if (openings.length) {
    const named = [...new Set([...openings.flatMap((o) => o.hardware), ...spaces.flatMap((s) => s.hardware), ...loose])];
    const withHardware = openings.filter((o) => o.hardware.length).length;
    scenes.push("End of the walk: " + totalText
      + (spaces.length ? " across " + spaces.length + " space" + (spaces.length === 1 ? "" : "s") : "") + ". "
      + (named.length
        ? "Hardware named at " + withHardware + " of " + openings.length + " stop" + (openings.length === 1 ? "" : "s") + ": " + capList(named, 8, "item") + "."
        : "No hardware named; check each opening against the hardware schedule."));
  } else if (spaces.length) {
    const named = [...new Set([...spaces.flatMap((s) => s.hardware), ...loose])];
    scenes.push("End of the walk: " + spaces.length + " space" + (spaces.length === 1 ? "" : "s") + ". "
      + (named.length ? "Hardware named: " + capList(named, 8, "item") + ". " : "")
      + "The description names no doors; name them (for example \"six wood doors with closers\") and the walk stops at each opening.");
  } else {
    scenes.push("End of the walk. "
      + (loose.length ? "Hardware named: " + capList(loose, 8, "item") + ". " : "")
      + "Name the spaces, doors and hardware (for example \"a lobby, two stair doors with closers\") and the walk stops at each one.");
  }

  // Logline: where the walk goes and what it stops at.
  const extraSpaces = spaces.filter((s) => s.start >= clauseEnd).map((s) => withThe(spaceText(s)));
  const openingItems = openings.map((o) => {
    if (o.row) return o.row;
    let phrase = mid(o.text);
    if (o.each) phrase = o.count + " " + plural(phrase.replace(/^(?:one|a|an|single)\s+/i, "")) + " (one for each of " + withThe(spaceText(o.each)) + ")";
    else if (!/^(?:\d|(?:a|an|the|one|single|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\b)/i.test(phrase)) phrase = "the " + phrase;
    const after = o.hardware.filter((h) => !asciiLower(o.text).includes(asciiLower(h)));
    return after.length ? phrase + " with " + joinList(after) : phrase;
  });
  // The same opening written many times reads once, with its tally.
  const tally = new Map();
  for (const item of openingItems) tally.set(item, (tally.get(item) || 0) + 1);
  const unique = [...tally].map(([item, n]) => n > 1 ? item + " (" + n + " times)" : item);
  const listed = unique.length > MAX_LISTED
    ? [...unique.slice(0, MAX_LISTED), (unique.length - MAX_LISTED) + " more"]
    : unique;
  const items = listed.some((i) => / and /.test(i)) ? listed.join("; ") : joinList(listed);
  const spacesListed = capList(extraSpaces, MAX_LISTED, "space");
  let logline;
  if (subjectHasOpening) {
    logline = "A walk past " + totalText + (extraSpaces.length ? ", through " + spacesListed : "") + ": " + items + ".";
  } else {
    logline = "A walk through " + withThe(mid(subject)) + (extraSpaces.length ? ", " + spacesListed : "")
      + (openings.length ? ", stopping at " + totalText + ": " + items : "") + ".";
  }

  const rows = openings.filter((o) => o.row);
  const title = rows.length && rows[0].start < clauseEnd
    ? "Walkthrough: Door Schedule, " + (rows.length > 1 ? "Doors " + rows[0].row.split(" ")[1] + " to " + rows[rows.length - 1].row.split(" ")[1] : "Door " + rows[0].row.split(" ")[1])
    : subject === "space described" ? "Walkthrough" : "Walkthrough: " + titleCase(subject);
  return {
    title: clip(title, MAX_TITLE_CHARS),
    logline: clip(logline, MAX_LOGLINE_CHARS),
    scenes: scenes.slice(0, MAX_SCENES).map((d, i) => ({ scene_number: i + 1, description: clip(d, MAX_SCENE_CHARS) })),
    walk: {
      setting: subject,
      spaces: spaces.map((s) => s.text),
      openings: openings.map((o) => ({ text: o.row || o.text, count: o.count, pair: o.pair, hardware: o.hardware, ratings: o.ratings })),
      levels: levels.map((l) => l.text),
      hardware_not_tied_to_a_stop: loose,
      opening_total: openings.length ? (unknown ? null : known) : 0,
    },
  };
}
