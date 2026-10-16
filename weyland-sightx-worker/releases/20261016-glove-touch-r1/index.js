var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
import p0 from "./c25a3b9bf90652058ec8e2abd0664a4c4d2c9c4d-c25a3b9bf90652058ec8e2abd0664a4c4d2c9c4d-4847b09e633103f7.pdf.bin";
import sightxHtml from "./796828aed6cd9ec5af1b821435b2e7a71024666f-e127f506ababc4689bbdaac5978172b51f86ffb3-sightx.html";
import sightxAppHtml from "./f55809877dff65cd38e3eebca74cbf2abb272d73-f55809877dff65cd38e3eebca74cbf2abb272d73-sightx-app.html";
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var NativeRouter = class _NativeRouter {
  static {
    __name(this, "_NativeRouter");
  }
  static {
    __name2(this, "NativeRouter");
  }
  constructor() {
    this.routes = /* @__PURE__ */ new Map();
    this.middlewares = [];
    this.errorHandler = null;
  }
  /**
   * Add a route to the router
   * @param {string} method - HTTP method
   * @param {string} path - Route path with optional params (:id)
   * @param {Function} handler - Request handler function
   */
  addRoute(method, path, handler) {
    const key = `${method}:${path}`;
    this.routes.set(key, {
      path,
      handler,
      regex: this.pathToRegex(path),
      params: this.extractParamNames(path)
    });
  }
  /**
   * Convert path pattern to regex
   * Supports :param and * wildcards
   */
  pathToRegex(path) {
    const pattern = path.replace(/\//g, "\\/").replace(/:(\w+)/g, "(?<$1>[^\\/]+)").replace(/\*/g, ".*");
    return new RegExp(`^${pattern}$`);
  }
  /**
   * Extract parameter names from path
   */
  extractParamNames(path) {
    const matches = path.matchAll(/:(\w+)/g);
    return Array.from(matches, (m) => m[1]);
  }
  /** Register GET route */
  get(path, handler) {
    this.addRoute("GET", path, handler);
    return this;
  }
  /** Register POST route */
  post(path, handler) {
    this.addRoute("POST", path, handler);
    return this;
  }
  /** Register PUT route */
  put(path, handler) {
    this.addRoute("PUT", path, handler);
    return this;
  }
  /** Register DELETE route */
  delete(path, handler) {
    this.addRoute("DELETE", path, handler);
    return this;
  }
  /** Register PATCH route */
  patch(path, handler) {
    this.addRoute("PATCH", path, handler);
    return this;
  }
  /** Register OPTIONS route */
  options(path, handler) {
    this.addRoute("OPTIONS", path, handler);
    return this;
  }
  /** Register middleware or catch-all route */
  all(path, handler) {
    if (path === "*") {
      this.middlewares.push(handler);
    } else {
      ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].forEach((method) => {
        this.addRoute(method, path, handler);
      });
    }
    return this;
  }
  /** Register error handler */
  catch(handler) {
    this.errorHandler = handler;
    return this;
  }
  /**
   * Handle incoming request
   * @param {Request} request - Cloudflare Workers Request object
   * @param {Object} env - Environment bindings
   * @param {Object} ctx - Execution context
   */
  async handle(request2, env2, ctx) {
    try {
      const url = new URL(request2.url);
      const method = request2.method;
      for (const middleware of this.middlewares) {
        const result = await middleware(request2, env2, ctx);
        if (result instanceof Response) {
          return result;
        }
      }
      const exactKey = `${method}:${url.pathname}`;
      if (this.routes.has(exactKey)) {
        const route = this.routes.get(exactKey);
        request2.params = {};
        return await route.handler(request2, env2, ctx);
      }
      for (const [key, route] of this.routes) {
        if (key.startsWith(`${method}:`)) {
          const match = url.pathname.match(route.regex);
          if (match) {
            request2.params = match.groups || {};
            if (!match.groups && route.params.length > 0) {
              request2.params = {};
              route.params.forEach((param, index) => {
                request2.params[param] = match[index + 1];
              });
            }
            return await route.handler(request2, env2, ctx);
          }
        }
      }
      return new Response(JSON.stringify({
        error: "Not found",
        path: url.pathname,
        method
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error4) {
      if (this.errorHandler) {
        return await this.errorHandler(error4, request2, env2, ctx);
      }
      console.error("Router error:", error4);
      return new Response(JSON.stringify({
        error: "Internal server error",
        message: error4.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  /** Convenience method to create a router instance */
  static create() {
    return new _NativeRouter();
  }
};
function jsonResponse3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse3, "jsonResponse3");
__name2(jsonResponse3, "jsonResponse3");
var MAX_INPUT = 1e3;
var MAX_SCENES = 16;
var MAX_SCENE_CHARS = 690;
var MAX_TITLE_CHARS = 150;
var MAX_LOGLINE_CHARS = 590;
var MAX_LISTED = 5;
var NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  dozen: 12,
  single: 1,
  a: 1,
  an: 1
};
var STOPWORDS = /* @__PURE__ */ new Set([
  "the",
  "with",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "from",
  "into",
  "through",
  "then",
  "plus",
  "has",
  "have",
  "had",
  "is",
  "are",
  "was",
  "were",
  "be",
  "its",
  "their",
  "each",
  "every",
  "all",
  "both",
  "along",
  "off",
  "by",
  "near",
  "next",
  "past",
  "via",
  "including",
  "includes",
  "include",
  "featuring",
  "that",
  "which",
  "where",
  "there",
  "here",
  "this",
  "these",
  "those",
  "it",
  "they",
  "we",
  "our",
  "your",
  "my",
  "will",
  "would",
  "should",
  "must",
  "can",
  "need",
  "needs",
  "not",
  "no",
  "but",
  "so",
  "if",
  "as",
  "than",
  "also",
  "only",
  "just",
  "about",
  "over",
  "under",
  "between",
  "behind",
  "beside",
  "inside",
  "outside",
  "around",
  "up",
  "down"
]);
var HARDWARE = [
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
  ["vision lites", /\bvision[- ]+(?:lites?|lights?|panels?|kits?)\b|\blouvers?\b/g]
];
var RATING = /\b(?:\d{1,3}|one|two|three|1-1\/2|1\.5)[- ]?(?:minutes?|mins?|hours?|hrs?)\b(?:[- ]+(?:fire[- ]+)?(?:rated|rating|label(?:ed|led)?))?/g;
var SCHEDULE_ROW = /\b([a-z]?\d{1,4}[a-z]?)\s+(hm|hmd|wd|wood|al|alum|aluminum|stl|steel|frp|gl|glass)\b(?:\s+(\d{4}|\d'?\s?-?\s?\d{1,2}"?\s*x\s*\d'?\s?-?\s?\d{1,2}"?))?(?:\s+(hw[- ]?\d+[a-z]?|set\s+\d+[a-z]?|hdw[- ]?\d+[a-z]?))?/g;
var OPENING = /\bpairs?\s+of\s+(?:[a-z0-9][\w\/-]*\s+){0,3}?doors\b|\bdouble[- ]+doors?\b|\b(?:doors?|doorways?|openings?|access[- ]+points?|gates?|pairs?)\b/g;
var SPACE = /\b(?:corridors?|hallways?|halls?|lobb(?:y|ies)|vestibules?|atri(?:um|a|ums)|foyers?|stair(?:well|way|case)?s?|entr(?:y|ies|ances?)|reception|rooms?|offices|suites?|areas?|zones?|wings?|bays?|docks?|terraces?|decks?|roof(?:top)?s?|courtyards?|plazas?|garages?|warehouses?|kitchens?|cafeterias?|classrooms?|restrooms?|bathrooms?|closets?|gym(?:nasium)?s?|auditori(?:um|a|ums)|librar(?:y|ies)|labs?|laborator(?:y|ies)|pharmac(?:y|ies)|nurses?'?\s+stations?|dorm(?:itor(?:y|ies))?s?|units?|apartments?|tenant\s+spaces?|lounges?|galler(?:y|ies)|chapels?|sanctuar(?:y|ies)|nurser(?:y|ies)|sally[- ]ports?|cells?)\b/g;
var LEVEL = /\b(?:(?:ground|first|second|third|fourth|fifth|sixth|top|lower|upper|main|1st|2nd|3rd|4th|5th|6th)[- ]+(?:floor|level|story|storey))\b|\bbasement\b|\bmezzanine\b|\b(?:level|floor)\s+\d+\b|\b(?:single|one|two|three|four|five|six|\d+)[- ]+stor(?:y|ey|ies|eys)\b/g;
var LEVEL_AT_START = new RegExp("^(?:" + LEVEL.source + ")");
function asciiLower(s) {
  return s.replace(/[A-Z]/g, (c) => c.toLowerCase());
}
__name(asciiLower, "asciiLower");
__name2(asciiLower, "asciiLower");
function normalize(description) {
  return String(description || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_INPUT);
}
__name(normalize, "normalize");
__name2(normalize, "normalize");
function tokenize(lower) {
  const tokens = [];
  const re = /[a-z0-9][a-z0-9'\/-]*(?:[.,]\d+)*/g;
  let m;
  while (m = re.exec(lower)) tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return tokens;
}
__name(tokenize, "tokenize");
__name2(tokenize, "tokenize");
function hasBoundary(lower, from, to) {
  return /\S/.test(lower.slice(from, to));
}
__name(hasBoundary, "hasBoundary");
__name2(hasBoundary, "hasBoundary");
function countOf(word) {
  if (word == null) return null;
  if (/^\d+$/.test(word)) return Number(word);
  return Object.prototype.hasOwnProperty.call(NUMBER_WORDS, word) ? NUMBER_WORDS[word] : null;
}
__name(countOf, "countOf");
__name2(countOf, "countOf");
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}
__name(overlaps, "overlaps");
__name2(overlaps, "overlaps");
function byStart(a, b) {
  return a.start - b.start;
}
__name(byStart, "byStart");
__name2(byStart, "byStart");
function byLengthDesc(a, b) {
  return b.end - b.start - (a.end - a.start);
}
__name(byLengthDesc, "byLengthDesc");
__name2(byLengthDesc, "byLengthDesc");
function collect(lower, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while (m = re.exec(lower)) {
    if (!m[0]) {
      re.lastIndex++;
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, groups: m.slice(1) });
  }
  return out;
}
__name(collect, "collect");
__name2(collect, "collect");
function extendLeft(lower, tokens, start, blocked, max, passable = []) {
  let s = start;
  let count = null;
  let steps = 0;
  for (let k = tokens.findIndex((t) => t.end > start) - 1; k >= 0 && steps < max; k--) {
    const t = tokens[k];
    if (t.end > s) continue;
    if (hasBoundary(lower, t.end, s)) break;
    const pass = passable.find((p) => overlaps(p, t));
    if (pass) {
      s = Math.min(s, pass.start);
      steps++;
      continue;
    }
    if (blocked.some((a) => overlaps(a, t))) break;
    const c = countOf(t.text);
    if (c != null) {
      s = t.start;
      count = c;
      break;
    }
    if (STOPWORDS.has(t.text)) break;
    s = t.start;
    steps++;
  }
  return { start: s, count };
}
__name(extendLeft, "extendLeft");
__name2(extendLeft, "extendLeft");
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
__name(extendRight, "extendRight");
__name2(extendRight, "extendRight");
function firstClauseEnd(lower) {
  const re = /:|;|\.(?=\s|$)|,(?!\d)|\s[-–—]\s|\s(?:with|including|featuring|where|which|that has|that have)\s/g;
  const m = re.exec(lower);
  return m ? m.index : lower.length;
}
__name(firstClauseEnd, "firstClauseEnd");
__name2(firstClauseEnd, "firstClauseEnd");
function stripLeadingArticle(phrase) {
  return phrase.replace(/^(?:a|an|the)\s+/i, "");
}
__name(stripLeadingArticle, "stripLeadingArticle");
__name2(stripLeadingArticle, "stripLeadingArticle");
function clip(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 3);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:-]+$/, "") + "...";
}
__name(clip, "clip");
__name2(clip, "clip");
function mid(phrase) {
  return /^[A-Z][a-z]/.test(phrase) && !/^[A-Z][a-z]*[A-Z]/.test(phrase) ? phrase[0].toLowerCase() + phrase.slice(1) : phrase;
}
__name(mid, "mid");
__name2(mid, "mid");
function sentenceStart(phrase) {
  return phrase ? phrase[0].toUpperCase() + phrase.slice(1) : phrase;
}
__name(sentenceStart, "sentenceStart");
__name2(sentenceStart, "sentenceStart");
var SMALL_WORDS = /* @__PURE__ */ new Set(["a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from", "per", "via"]);
function titleCase(phrase) {
  return phrase.split(" ").map((word, i) => {
    if (!word) return word;
    if (/^(?:sq\.?\s?ft\.?|sqft|sf)$/i.test(word)) return "sq ft";
    if (/[A-Z]/.test(word.slice(1)) || /\d/.test(word)) return word;
    if (i > 0 && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
    return word.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join("-");
  }).join(" ");
}
__name(titleCase, "titleCase");
__name2(titleCase, "titleCase");
function joinList(items) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}
__name(joinList, "joinList");
__name2(joinList, "joinList");
function capList(items, max, noun) {
  if (items.length <= max) return joinList(items);
  const more = items.length - max;
  return items.slice(0, max).join(", ") + " and " + more + " more " + noun + (more === 1 ? "" : "s");
}
__name(capList, "capList");
__name2(capList, "capList");
function withThe(phrase) {
  if (/^(?:the|this|that|our|your|their|its)\s/i.test(phrase)) return phrase;
  if (/\s(?:[a-z]?\d+[a-z]?|\d+\s*(?:-|to|through|thru)\s*\d+[a-z]?)$/i.test(phrase)) return phrase;
  return "the " + stripLeadingArticle(phrase);
}
__name(withThe, "withThe");
__name2(withThe, "withThe");
function plural(phrase) {
  return /s$/i.test(phrase) ? phrase : phrase + "s";
}
__name(plural, "plural");
__name2(plural, "plural");
function stopText(opening) {
  if (opening.row) return opening.row;
  return mid(opening.count === 1 && !opening.each ? opening.text.replace(/^(?:one|a|an|single)\s+/i, "") : opening.text);
}
__name(stopText, "stopText");
__name2(stopText, "stopText");
function spaceText(space) {
  return mid(space.text.replace(/^(?:one|a|an|single)\s+/i, ""));
}
__name(spaceText, "spaceText");
__name2(spaceText, "spaceText");
function sentenceIndex(lower, pos) {
  let n = 0;
  const re = /[.;:!?](?=\s|$)/g;
  let m;
  while ((m = re.exec(lower)) && m.index < pos) n++;
  return n;
}
__name(sentenceIndex, "sentenceIndex");
__name2(sentenceIndex, "sentenceIndex");
function buildWalkthrough(description) {
  const text = normalize(description);
  const lower = asciiLower(text);
  const tokens = tokenize(lower);
  const original = /* @__PURE__ */ __name2((span) => text.slice(span.start, span.end).trim(), "original");
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
  const openings = [];
  for (const row of collect(lower, SCHEDULE_ROW)) {
    if (marks.some((a) => overlaps(a, row))) continue;
    const g = text.slice(row.start, row.end).trim().split(/\s+/);
    const mark = g[0];
    const set = row.groups[3] ? text.slice(row.end - row.groups[3].length, row.end) : "";
    const body = text.slice(row.start + mark.length, row.end - set.length).trim();
    openings.push({
      start: row.start,
      end: row.end,
      count: 1,
      pair: false,
      kind: "opening",
      text: original(row),
      row: "door " + mark + " (" + body + (set ? ", hardware set " + set : "") + ")",
      hardware: set ? ["hardware set " + set] : [],
      ratings: []
    });
  }
  const openingCandidates = collect(lower, OPENING).filter((noun) => !tagged.some((a) => overlaps(a, noun)) && !openings.some((a) => overlaps(a, noun))).map((noun) => {
    const left = extendLeft(lower, tokens, noun.start, openings, 4, tagged);
    const right = extendRight(lower, noun.end);
    const nounText = lower.slice(noun.start, noun.end);
    const isPair = /^pairs?\s+of\b|^double[- ]|^pairs?$/.test(nounText);
    const isPlural = /s$/.test(nounText) && !/^double[- ]+doors$/.test(nounText);
    let count = left.count != null ? left.count : right.rangeCount;
    if (count == null && (!isPlural || /^double[- ]+doors$|^pair\s+of\b/.test(nounText))) count = 1;
    return { start: left.start, end: right.end, count, pair: isPair };
  }).sort(byLengthDesc);
  for (const o of openingCandidates) {
    if (openings.some((a) => overlaps(a, o))) continue;
    openings.push({ ...o, text: original(o), kind: "opening", hardware: [], ratings: [] });
  }
  openings.sort(byStart);
  for (const item of tagged) {
    const owner = openings.find((o) => overlaps(o, item));
    if (owner) {
      (item.kind === "hardware" ? owner.hardware : owner.ratings).push(item.text);
      item.attached = true;
    }
  }
  const blocked = [...marks, ...openings];
  const spaceCandidates = collect(lower, SPACE).filter((noun) => !blocked.some((a) => overlaps(a, noun))).map((noun) => {
    const left = extendLeft(lower, tokens, noun.start, blocked, 3);
    const right = extendRight(lower, noun.end);
    return { start: left.start, end: right.end, head: lower.slice(noun.start, noun.end), rangeCount: right.rangeCount };
  }).sort(byLengthDesc);
  const spaces = [];
  for (const s of spaceCandidates) {
    if (blocked.some((a) => overlaps(a, s)) || spaces.some((a) => overlaps(a, s))) continue;
    if (/\b(?:of|in)\s+(?:a|an)\s+$/.test(lower.slice(Math.max(0, s.start - 8), s.start))) continue;
    spaces.push({ ...s, text: original(s), kind: "space", hardware: [], ratings: [] });
  }
  spaces.sort(byStart);
  for (const o of openings) {
    if (o.count !== 1 || o.row || !/\beach\s+(?:with|has|have|gets?)\s+$/.test(lower.slice(Math.max(0, o.start - 16), o.start))) continue;
    const room = spaces.filter((s) => s.end <= o.start && s.rangeCount).pop();
    if (room) {
      o.count = room.rangeCount;
      o.each = room;
    }
  }
  const levels = collect(lower, LEVEL).filter((span) => ![...blocked, ...spaces].some((a) => overlaps(a, span))).map((span) => ({ start: span.start, end: span.end, text: original(span), kind: "level" }));
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
  const clauseEnd = firstClauseEnd(lower);
  const subjectRaw = text.slice(0, clauseEnd).replace(/[\s,;:.\-–—]+$/, "").trim();
  const subject = /[a-z0-9]/i.test(subjectRaw) ? clip(stripLeadingArticle(subjectRaw), 110) : "space described";
  const subjectLower = asciiLower(subject);
  const subjectHasOpening = openings.some((o) => o.start < clauseEnd);
  const known = openings.filter((o) => o.count != null).reduce((n, o) => n + o.count, 0);
  const unknown = openings.some((o) => o.count == null);
  const totalText = openings.length ? unknown ? Math.max(known, 2) + " or more openings" : known + " opening" + (known === 1 ? "" : "s") : "";
  const stops = [...spaces, ...openings, ...levels.filter((l) => l.start >= clauseEnd && !/stor(?:y|ey|ies|eys)$/i.test(l.text))].sort(byStart);
  const scenes = [];
  scenes.push(subjectHasOpening ? "Start the walk: " + totalText + " to stop at." : "Arrive at " + withThe(mid(subject)) + "." + (totalText ? " " + sentenceStart(totalText) + " on this walk." : ""));
  const middle = [];
  let walked = false;
  for (const stop of stops) {
    const own = asciiLower(stop.text);
    const hw = (stop.hardware || []).filter((h) => !own.includes(asciiLower(h)));
    const rt = (stop.ratings || []).filter((r) => !own.includes(asciiLower(r)));
    if (stop.kind === "space") {
      const sameAsSetting = asciiLower(stripLeadingArticle(stop.text)) === subjectLower;
      const lines = [sameAsSetting ? "Walk the length of the " + stop.head.replace(/s$/, "") + "." : (walked ? "Continue to " : "Walk ") + withThe(spaceText(stop)) + "."];
      if (hw.length) lines.push("Hardware named here: " + joinList(hw) + ".");
      if (rt.length) lines.push("Rating: " + joinList(rt) + ".");
      middle.push(lines.join(" "));
      walked = true;
    } else if (stop.kind === "level") {
      middle.push("Go to " + withThe(mid(stop.text)) + ".");
    } else {
      const lines = [stop.each ? "Stop at the " + plural(stopText(stop).replace(/^(?:one|a|an|single)\s+/i, "")) + ", one for each of " + withThe(spaceText(stop.each)) + " (" + stop.count + ")." : "Stop at " + (stop.row ? stopText(stop) : withThe(stopText(stop))) + "."];
      if (stop.pair) lines.push(stop.count === 1 ? "A pair: two leaves." : "Pairs: two leaves each.");
      if (hw.length && !stop.row) lines.push("Hardware named: " + joinList(hw) + ".");
      if (rt.length) lines.push("Rating: " + joinList(rt) + ".");
      if (!stop.hardware.length) {
        lines.push(stop.count === 1 ? "The description names no hardware for it; check it against the hardware schedule." : "The description names no hardware for them; check each against the hardware schedule.");
      }
      middle.push(lines.join(" "));
    }
  }
  if (!stops.length) {
    text.slice(clauseEnd).split(/[,;:]|\.(?=\s|$)|\s(?:then|and then)\s/i).map((c) => c.replace(/^\s*(?:with|including|featuring|and|then)\s+/i, "").trim()).filter((c) => c.split(/\s+/).length >= 2).forEach((c) => middle.push("Next: " + c + "."));
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
        for (const o of restOpenings) {
          const k = o.row ? "schedule rows" : plural(stopText(o).replace(/^(?:one|a|an|single|\d+|two|three|four|five|six|seven|eight|nine|ten)\s+/i, ""));
          kinds[k] = (kinds[k] || 0) + (o.count || 1);
        }
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
    const named = [.../* @__PURE__ */ new Set([...openings.flatMap((o) => o.hardware), ...spaces.flatMap((s) => s.hardware), ...loose])];
    const withHardware = openings.filter((o) => o.hardware.length).length;
    scenes.push("End of the walk: " + totalText + (spaces.length ? " across " + spaces.length + " space" + (spaces.length === 1 ? "" : "s") : "") + ". " + (named.length ? "Hardware named at " + withHardware + " of " + openings.length + " stop" + (openings.length === 1 ? "" : "s") + ": " + capList(named, 8, "item") + "." : "No hardware named; check each opening against the hardware schedule."));
  } else if (spaces.length) {
    const named = [.../* @__PURE__ */ new Set([...spaces.flatMap((s) => s.hardware), ...loose])];
    scenes.push("End of the walk: " + spaces.length + " space" + (spaces.length === 1 ? "" : "s") + ". " + (named.length ? "Hardware named: " + capList(named, 8, "item") + ". " : "") + 'The description names no doors; name them (for example "six wood doors with closers") and the walk stops at each opening.');
  } else {
    scenes.push("End of the walk. " + (loose.length ? "Hardware named: " + capList(loose, 8, "item") + ". " : "") + 'Name the spaces, doors and hardware (for example "a lobby, two stair doors with closers") and the walk stops at each one.');
  }
  const extraSpaces = spaces.filter((s) => s.start >= clauseEnd).map((s) => withThe(spaceText(s)));
  const openingItems = openings.map((o) => {
    if (o.row) return o.row;
    let phrase = mid(o.text);
    if (o.each) phrase = o.count + " " + plural(phrase.replace(/^(?:one|a|an|single)\s+/i, "")) + " (one for each of " + withThe(spaceText(o.each)) + ")";
    else if (!/^(?:\d|(?:a|an|the|one|single|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen)\b)/i.test(phrase)) phrase = "the " + phrase;
    const after = o.hardware.filter((h) => !asciiLower(o.text).includes(asciiLower(h)));
    return after.length ? phrase + " with " + joinList(after) : phrase;
  });
  const tally = /* @__PURE__ */ new Map();
  for (const item of openingItems) tally.set(item, (tally.get(item) || 0) + 1);
  const unique = [...tally].map(([item, n]) => n > 1 ? item + " (" + n + " times)" : item);
  const listed = unique.length > MAX_LISTED ? [...unique.slice(0, MAX_LISTED), unique.length - MAX_LISTED + " more"] : unique;
  const items = listed.some((i) => / and /.test(i)) ? listed.join("; ") : joinList(listed);
  const spacesListed = capList(extraSpaces, MAX_LISTED, "space");
  let logline;
  if (subjectHasOpening) {
    logline = "A walk past " + totalText + (extraSpaces.length ? ", through " + spacesListed : "") + ": " + items + ".";
  } else {
    logline = "A walk through " + withThe(mid(subject)) + (extraSpaces.length ? ", " + spacesListed : "") + (openings.length ? ", stopping at " + totalText + ": " + items : "") + ".";
  }
  const rows2 = openings.filter((o) => o.row);
  const title = rows2.length && rows2[0].start < clauseEnd ? "Walkthrough: Door Schedule, " + (rows2.length > 1 ? "Doors " + rows2[0].row.split(" ")[1] + " to " + rows2[rows2.length - 1].row.split(" ")[1] : "Door " + rows2[0].row.split(" ")[1]) : subject === "space described" ? "Walkthrough" : "Walkthrough: " + titleCase(subject);
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
      opening_total: openings.length ? unknown ? null : known : 0
    }
  };
}
__name(buildWalkthrough, "buildWalkthrough");
__name2(buildWalkthrough, "buildWalkthrough");
var RENDER_TIMEOUT_MS = 1e4;
var ACCENT = "#f0b800";
function escapeHtmlText(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}
__name(escapeHtmlText, "escapeHtmlText");
__name2(escapeHtmlText, "escapeHtmlText");
function registerSightXWalkthroughRoutes(router2) {
  router2.post("/api/sightx/walkthrough-preview", async (request2, env2) => {
    let body;
    try {
      body = await request2.json();
    } catch {
      return jsonResponse3({ detail: { message: "invalid JSON body" } }, 400);
    }
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1e3) : "";
    if (!description) return jsonResponse3({ detail: { message: "description is required" } }, 400);
    if (!env2.FILMLINE_VIDEO) {
      return jsonResponse3({ detail: { message: "FILMLINE_VIDEO binding not configured on this Worker" } }, 500);
    }
    const walkthrough = buildWalkthrough(description);
    try {
      const upstream = await env2.FILMLINE_VIDEO.fetch("https://filmline-video-worker/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: walkthrough.title,
          logline: walkthrough.logline,
          scenes: walkthrough.scenes,
          accent: ACCENT
        }),
        signal: AbortSignal.timeout(RENDER_TIMEOUT_MS)
      });
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data?.video?.svg) {
        return jsonResponse3({ detail: { message: "the storyboard could not be drawn", upstream: data } }, 502);
      }
      return jsonResponse3({
        title: walkthrough.title,
        logline_escaped: escapeHtmlText(walkthrough.logline),
        scene_count: walkthrough.scenes.length,
        total_seconds: data.video.total_seconds,
        svg: data.video.svg,
        narration_lines: [walkthrough.logline, ...walkthrough.scenes.map((s) => s.description)],
        scenes: walkthrough.scenes,
        walk: walkthrough.walk,
        source: "deterministic walkthrough builder in weyland-sightx-worker (no model) -> filmline-video-worker /api/render"
      });
    } catch (err) {
      console.error("[SightX walkthrough-preview] render error:", err && err.message);
      return jsonResponse3({ detail: { message: "the storyboard could not be drawn: " + (err && err.message || "render call failed") } }, 502);
    }
  });
}
__name(registerSightXWalkthroughRoutes, "registerSightXWalkthroughRoutes");
__name2(registerSightXWalkthroughRoutes, "registerSightXWalkthroughRoutes");
var DEFAULT_WIDTH_IN = 36;
var DEFAULT_HEIGHT_IN = 84;
var MAX_DOORS = 400;
var ITEM_TYPES = [
  ["exit", /\b(exit|panic|crash)\s*(device|bar|hardware)?s?\b|\bvon duprin\s*(98|99|33|35|22)|\b(98|99|33a|35a|22)-?(eo|nl|l|ta|dt)\b/i],
  ["maglock", /\bmag(netic)?\s*-?lock|\bmaglock|\bsecuritron\s*m\d|\bm62\b/i],
  ["operator", /\b(auto(matic)?|power|low[- ]energy)\s*(door\s*)?(operator|opener)s?\b|\bactuators?\b|\bpush\s*buttons?\b/i],
  ["closer", /\bclosers?\b|\blcn\s*\d{4}|\b4040xp|\b4111\b|\b1460\b|\bdc\d{4}\b/i],
  ["reader", /\b(card|badge|prox(imity)?)\s*readers?\b|\baccess\s*control\b|\bkeypads?\b/i],
  ["strike", /\belectric\s*strikes?\b|\bstrikes?\b/i],
  ["kick", /\b(kick|armou?r|mop)\s*plates?\b|\bk10\d\d\b/i],
  ["push", /\bpush\s*plates?\b/i],
  ["pull", /\b(door\s*)?pulls?\b/i],
  ["hinge", /\bhinges?\b|\bpivots?\b|\bbb\d{3,4}\b|\bcontinuous\s*geared\b/i],
  ["lockset", /\block(set)?s?\b|\blevers?\b|\bpassage\b|\bprivacy\b|\bstoreroom\b|\bclassroom\b|\bmortise\b|\bcylindrical\b|\bnd\d{2}|\bml\d{4}|\b10-line\b|\bdeadbolts?\b/i],
  ["stop", /\b(wall|floor|overhead)\s*stops?\b|\bstops?\b/i],
  ["holder", /\bholders?\b|\bhold[- ]?opens?\b/i],
  ["bolt", /\bflush\s*bolts?\b|\bbolts?\b/i],
  ["coordinator", /\bcoordinators?\b/i],
  ["seal", /\bweather\s*strip\w*|\bgasket\w*|\bseals?\b|\bsmoke\s*seal|\bpemko\s*303/i],
  ["threshold", /\bthresholds?\b/i],
  ["silencer", /\bsilencers?\b/i]
];
function itemType(text) {
  const t = String(text || "");
  for (const [type, re] of ITEM_TYPES) if (re.test(t)) return type;
  return "other";
}
__name(itemType, "itemType");
__name2(itemType, "itemType");
var MATERIALS = [
  ["aluminum", /\b(al|alum|aluminum|aluminium|storefront|sf)\b/i],
  ["glass", /\b(gl|glass|all[- ]glass)\b/i],
  ["wood", /\b(wd|wood|scw|solid core|pf|plastic laminate)\b/i],
  ["hollow metal", /\b(hm|hmd|hollow metal|steel|stl|metal)\b/i],
  ["frp", /\bfrp\b/i]
];
function materialOf(text) {
  const t = String(text || "");
  for (const [m, re] of MATERIALS) if (re.test(t)) return m;
  return null;
}
__name(materialOf, "materialOf");
__name2(materialOf, "materialOf");
function parseSize(text) {
  const t = String(text || "");
  let m = t.match(/(\d{1,2})\s*'\s*-?\s*(\d{1,2})?\s*"?\s*[x×]\s*(\d{1,2})\s*'\s*-?\s*(\d{1,2})?\s*"?/i);
  if (m) return { w: +m[1] * 12 + (+m[2] || 0), h: +m[3] * 12 + (+m[4] || 0) };
  m = t.match(/\b(\d{2,3})\s*"?\s*[x×]\s*(\d{2,3})\s*"?(?!\d)/i);
  if (m && +m[1] >= 18 && +m[1] <= 144 && +m[2] >= 60 && +m[2] <= 168) return { w: +m[1], h: +m[2] };
  m = t.match(/\b([1-9])([0-9]|1[01])([6-9])([0-9]|1[01])\b/);
  if (m) return { w: +m[1] * 12 + +m[2], h: +m[3] * 12 + +m[4] };
  return null;
}
__name(parseSize, "parseSize");
__name2(parseSize, "parseSize");
function ratingOf(text) {
  const t = String(text || "");
  const m = t.match(/\b(20|45|60|90|180)\s*-?\s*min(ute)?s?\b|\b(1|1\.5|1-1\/2|2|3)\s*-?\s*(hr|hour)s?\b/i);
  if (!m) return null;
  if (m[1]) return m[1] + " min";
  const h = m[3] === "1-1/2" ? "1.5" : m[3];
  return h + " hr";
}
__name(ratingOf, "ratingOf");
__name2(ratingOf, "ratingOf");
var SET_RE = /\b(?:hw|hdw|hardware|set|group|grp)\s*(?:set\s*)?(?:no\.?\s*|#\s*)?[- :]?\s*([a-z]?\d{1,3}[a-z]?(?:\.\d+)?)\b/i;
function setOf(text) {
  const m = String(text || "").match(SET_RE);
  return m ? m[1].toUpperCase() : null;
}
__name(setOf, "setOf");
__name2(setOf, "setOf");
function door(partial) {
  const size = partial.size || null;
  const w = size ? size.w : DEFAULT_WIDTH_IN;
  const h = size ? size.h : DEFAULT_HEIGHT_IN;
  const leaves = partial.leaves || (w >= 60 ? 2 : 1);
  return {
    mark: String(partial.mark || "").slice(0, 24),
    location: partial.location ? String(partial.location).slice(0, 80) : null,
    type: partial.type ? String(partial.type).slice(0, 60) : null,
    material: partial.material || materialOf(partial.type) || null,
    width_in: w,
    height_in: h,
    size_known: !!size,
    leaves,
    rating: partial.rating || null,
    frame: partial.frame ? String(partial.frame).slice(0, 40) : null,
    panic: !!partial.panic,
    set: partial.set || null,
    source_page: partial.source_page ?? null,
    source_sheet: partial.source_sheet || null
  };
}
__name(door, "door");
__name2(door, "door");
function splitCells(line) {
  if (line.includes("	")) return line.split("	").map((c) => c.trim());
  if ((line.match(/,/g) || []).length >= 2) return line.split(",").map((c) => c.trim());
  if ((line.match(/\|/g) || []).length >= 2) return line.split("|").map((c) => c.trim()).filter((c, i, a) => !(c === "" && (i === 0 || i === a.length - 1)));
  if (/\S\s{2,}\S/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim());
  return null;
}
__name(splitCells, "splitCells");
__name2(splitCells, "splitCells");
var HEADER_KEYS = [
  ["mark", /^(door|opening)?\s*(no\.?|number|#|mark|id)$|^door$|^opening$|^mark$/i],
  ["location", /location|room|space|from|to|description$/i],
  ["size", /^size$|door size|nominal/i],
  ["width", /^w(idth)?\.?$/i],
  ["height", /^h(eight)?\.?$|^ht\.?$/i],
  ["type", /door\s*type|^type$|^door\s*matl|material|^matl/i],
  ["frame", /frame/i],
  ["rating", /rating|label|fire|^rtg$/i],
  ["set", /hardware|hdw|hw|^set$|group/i],
  ["hardware_desc", /hardware\s*desc|description of hardware|hdw\s*desc/i],
  ["parts", /manufacturer|part\s*no|catalog|model/i]
];
function headerMap(cells) {
  const map = {};
  let hits = 0;
  cells.forEach((c, i) => {
    const t = c.trim();
    if (!t) return;
    for (const [key, re] of HEADER_KEYS) {
      if (key === "set" && /desc/i.test(t)) continue;
      if (re.test(t) && map[key] == null) {
        map[key] = i;
        hits++;
        break;
      }
    }
  });
  return hits >= 2 && map.mark != null ? map : null;
}
__name(headerMap, "headerMap");
__name2(headerMap, "headerMap");
function itemsFromText(text) {
  return String(text || "").split(/\s*[·;,+]\s*|\s+\band\b\s+/i).map((s) => s.trim()).filter(Boolean).map((label) => ({
    type: itemType(label),
    qty: 1,
    label: label.slice(0, 120),
    manufacturer: null,
    catalog: null,
    finish: null
  }));
}
__name(itemsFromText, "itemsFromText");
__name2(itemsFromText, "itemsFromText");
function parseSchedule(text, { project = "Pasted schedule" } = {}) {
  const lines = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  const doors = [];
  const sets = {};
  const notes = [];
  let header = null;
  for (const raw of lines.slice(0, 600)) {
    const line = raw.trim();
    const def = line.match(/^(?:hw|hdw|hardware\s*set|set|group)\s*[- #]?\s*([a-z]?\d{1,3}[a-z]?)\s*[:=–—-]\s*(.+)$/i);
    if (def && !/\b\d{4}\b/.test(def[2].slice(0, 12))) {
      const k = def[1].toUpperCase();
      sets[k] = (sets[k] || []).concat(itemsFromText(def[2]));
      continue;
    }
    const cells = splitCells(raw);
    if (cells && !header) {
      const h = headerMap(cells);
      if (h) {
        header = h;
        continue;
      }
    }
    if (cells && header) {
      const get = /* @__PURE__ */ __name2((k) => header[k] != null ? (cells[header[k]] || "").trim() : "", "get");
      const mark = get("mark");
      if (!mark || /^(door|mark|no\.?)$/i.test(mark)) continue;
      let size = parseSize(get("size"));
      if (!size && get("width") && get("height")) {
        size = parseSize(get("width") + " x " + get("height")) || parseSize(`${get("width")}x${get("height")}`);
      }
      const rowText = cells.join(" ");
      if (!size) size = parseSize(rowText);
      const setVal = get("set");
      const set = setVal ? setOf(setVal) || setVal.toUpperCase().replace(/\s+/g, "") : setOf(rowText);
      const typeText = get("type");
      const desc = get("hardware_desc");
      const parts = get("parts");
      if (set && (desc || parts) && !sets[set]) {
        const items = parts ? itemsFromText(parts) : itemsFromText(desc);
        if (desc && parts && items.length) items[0].label = items[0].label;
        sets[set] = items.map((it) => ({ ...it, type: it.type === "other" ? itemType(desc) : it.type }));
      }
      doors.push(door({
        mark,
        location: get("location") || null,
        type: typeText || null,
        material: materialOf(typeText) || materialOf(rowText),
        size,
        leaves: /\b(pr|pair|double)\b/i.test(rowText) ? 2 : null,
        rating: ratingOf(get("rating")) || ratingOf(rowText),
        frame: get("frame") || null,
        panic: /\b(panic|exit device)\b/i.test(rowText + " " + desc),
        set
      }));
    } else {
      const m = line.match(/^([a-z]{0,3}[- ]?\d{1,4}[a-z]?(?:\.\d+)?)\b\s*(.*)$/i);
      if (!m || !(parseSize(line) || materialOf(m[2]) || setOf(m[2]))) continue;
      const rest = m[2];
      const size = parseSize(rest);
      const set = setOf(rest);
      const rating = ratingOf(rest);
      const material = materialOf(rest);
      const location = rest.replace(/\b(pr|pair)\b/gi, " ").replace(SET_RE, " ").replace(/\b\d{1,2}\s*'\s*-?\s*\d{0,2}\s*"?\s*[x×]\s*\d{1,2}\s*'\s*-?\s*\d{0,2}\s*"?|\b\d{4}\b|\b\d{2,3}\s*[x×]\s*\d{2,3}\b/gi, " ").replace(/\b(20|45|60|90|180)\s*-?\s*min(ute)?s?\b|\b(1|1\.5|2|3)\s*-?\s*(hr|hour)s?\b/gi, " ").replace(/\b(hm|hmd|wd|wood|al|alum|aluminum|stl|steel|frp|gl|glass|scw)\b/gi, " ").replace(/\s+/g, " ").trim();
      doors.push(door({
        mark: m[1].replace(/\s+/g, ""),
        location: location || null,
        type: material ? material.toUpperCase() : null,
        material,
        size,
        leaves: /\b(pr|pair|double)\b/i.test(rest) ? 2 : null,
        rating,
        panic: /\b(panic|exit device)\b/i.test(rest),
        set
      }));
    }
    if (doors.length >= MAX_DOORS) {
      notes.push(`Only the first ${MAX_DOORS} doors are drawn.`);
      break;
    }
  }
  const unsized = doors.filter((d) => !d.size_known).length;
  if (unsized) notes.push(`${unsized} door${unsized === 1 ? " has" : "s have"} no size in the schedule; drawn 3'-0" x 7'-0".`);
  const missingSets = [...new Set(doors.map((d) => d.set).filter((s) => s && !sets[s]))];
  if (missingSets.length) notes.push(`No hardware listed for set${missingSets.length === 1 ? "" : "s"} ${missingSets.slice(0, 8).join(", ")}${missingSets.length > 8 ? "\u2026" : ""}; add lines like "HW-1: closer, exit device, kick plate".`);
  return { project: String(project).slice(0, 120), source: "paste", doors, sets, notes };
}
__name(parseSchedule, "parseSchedule");
__name2(parseSchedule, "parseSchedule");
var setKey = /* @__PURE__ */ __name2((s) => String(s || "").toUpperCase().trim().replace(/(^|[^0-9])0+(?=\d)/g, "$1"), "setKey");
function modelFromSubx(d) {
  const sets = {};
  for (const c of d.components || []) {
    const k = setKey(c.set_number);
    if (!k) continue;
    const label = [c.description, c.manufacturer, c.model].filter(Boolean).join(" \xB7 ") || c.component_type || "item";
    (sets[k] = sets[k] || []).push({
      type: itemType([c.component_type, c.description, c.model, c.catalog_number].filter(Boolean).join(" ")),
      qty: c.quantity || 1,
      label: label.slice(0, 120),
      manufacturer: c.manufacturer || null,
      catalog: c.catalog_number || c.model || null,
      finish: c.finish || null
    });
  }
  const doors = (d.doors || []).slice(0, MAX_DOORS).map((x) => door({
    mark: x.mark,
    location: x.notes || null,
    type: x.door_type || null,
    material: materialOf(x.door_material) || materialOf(x.door_type),
    size: x.width_inches && x.height_inches ? { w: x.width_inches, h: x.height_inches } : null,
    rating: x.fire_rating ? ratingOf(x.fire_rating) || String(x.fire_rating) : null,
    frame: [x.frame_material, x.frame_type].filter(Boolean).join(" ") || null,
    panic: !!x.panic && !/^(no|n|0|false)$/i.test(String(x.panic)),
    set: x.hardware_group ? setKey(x.hardware_group) : null,
    source_page: (x.source && x.source.page) ?? x.page_number ?? null,
    source_sheet: x.source?.sheet || null
  }));
  const notes = [];
  const unsized = doors.filter((x) => !x.size_known).length;
  if (unsized) notes.push(`${unsized} door${unsized === 1 ? " has" : "s have"} no size read from the schedule; drawn 3'-0" x 7'-0".`);
  return { project: d.session && (d.session.project_name || d.session.filename) || "SubX session", source: "subx", doors, sets, notes };
}
__name(modelFromSubx, "modelFromSubx");
__name2(modelFromSubx, "modelFromSubx");
var SAMPLE_SHEET = {
  project: "The WeylandAI Building (sample sheet A9.01)",
  rows: [
    ["D-101", "Main Lobby Entry", "Aluminum Storefront", "HW-01", "Storefront exit device + closer", "Von Duprin 98-NL-OP \xB7 LCN 4040XP-EDA"],
    ["D-114", "Conference Rm A", "Wood, Solid Core", "HW-04", "Lever set + hinges", "Schlage ND70PD RHO 626"],
    ["D-118A", "IT / Server Room", "Hollow Metal", "HW-07", "Electrified lever + mag lock", "Schlage ND96PD EL RHO \xB7 Securitron M62"],
    ["D-122", "Stairwell 1", "Hollow Metal, Fire-Rated", "HW-02", "Fire-rated closer + panic hardware", "Von Duprin 33A-EO \xB7 LCN 4111"],
    ["D-201", "Executive Suite", "Wood, Solid Core", "HW-05", "Privacy lever", "Corbin Russwin ML2057 LWA 626"],
    ["D-207", "Break Room", "Wood, Solid Core", "HW-03", "Passage lever", "Sargent 10-Line 8205 LNL"],
    ["D-214B", "Mechanical Room", "Hollow Metal", "HW-08", "Cylindrical lock + kick plate", "Hager 3400 US32D \xB7 Rockwood K1050"],
    ["D-305", "Roof Access", "Hollow Metal, Weatherstripped", "HW-09", "Weatherstripped panic hardware", "Von Duprin 22-EO \xB7 Pemko 303AS"],
    ["D-310", "Data Closet, 3rd Fl", "Hollow Metal", "HW-07", "Electrified lever + mag lock", "Schlage ND96PD EL RHO \xB7 Securitron M62"],
    ["D-311", "Janitor Closet, 3rd Fl", "Hollow Metal", "HW-03", "Passage lever", "Sargent 10-Line 8205 LNL"]
  ]
};
function sampleModel() {
  const sets = {};
  const doors = SAMPLE_SHEET.rows.map(([mark, location, type, set, desc, parts]) => {
    if (!sets[set]) {
      const descParts = desc.split(/\s*\+\s*/);
      sets[set] = parts.split(/\s*·\s*/).map((p, i) => {
        const byPart = itemType(p);
        const type2 = byPart !== "other" ? byPart : itemType(descParts[i] || desc);
        const mfr = p.match(/^(Von Duprin|LCN|Schlage|Securitron|Corbin Russwin|Sargent|Hager|Rockwood|Pemko)\b/);
        return { type: type2, qty: 1, label: p, manufacturer: mfr ? mfr[1] : null, catalog: mfr ? p.slice(mfr[1].length).trim() : p, finish: null };
      });
      if (/hinges/i.test(desc) && !sets[set].some((x) => x.type === "hinge")) sets[set].push({ type: "hinge", qty: 3, label: "Hinges (no product named on the sheet)", manufacturer: null, catalog: null, finish: null });
    }
    return door({
      mark,
      location,
      type,
      material: materialOf(type),
      size: null,
      rating: /fire-rated/i.test(type) ? "fire-rated" : null,
      panic: /panic|exit device/i.test(desc),
      set
    });
  });
  return {
    project: SAMPLE_SHEET.project,
    source: "sample",
    doors,
    sets,
    notes: [`Sheet A9.01 gives no door sizes: every door is drawn 3'-0" x 7'-0". D-122 is fire-rated on the sheet but no rating is printed.`]
  };
}
__name(sampleModel, "sampleModel");
__name2(sampleModel, "sampleModel");
var nk = /* @__PURE__ */ __name2((s) => String(s || "").toUpperCase().replace(/\s+/g, ""), "nk");
var FT = 1;
function attachPlan(model, plan) {
  if (!plan || !plan.found || !Array.isArray(plan.tags) || !plan.tags.length) {
    model.layout = { source: "schematic", note: "Schematic layout from the schedule: " + (plan && plan.reason ? plan.reason : "no floor plan was read for these doors") + " Doors stand in schedule order along one corridor." };
    return model;
  }
  const bySheet = /* @__PURE__ */ new Map();
  for (const t of plan.tags) {
    const k = t.page + "|" + t.sheet;
    if (!bySheet.has(k)) bySheet.set(k, { page: t.page, sheet: t.sheet, tags: [] });
    bySheet.get(k).tags.push(t);
  }
  const sheetInfo = new Map((plan.plan_sheets || []).map((s) => [s.page, s]));
  const buildings = [];
  let offsetX = 0;
  const placed = /* @__PURE__ */ new Map();
  for (const b of bySheet.values()) {
    const info = sheetInfo.get(b.page) || {};
    const ppfs = b.tags.map((t) => t.points_per_foot).filter((x) => x > 0);
    const scaled = ppfs.length > 0;
    const ppfOf = /* @__PURE__ */ __name2((v) => v > 0 ? v : scaled ? ppfs[0] : 9, "ppfOf");
    const rooms = (plan.rooms || []).filter((r) => r.page === b.page);
    const pts = [...b.tags.map((t) => [t.x / ppfOf(t.points_per_foot), t.y / ppfOf(t.points_per_foot)]), ...rooms.map((r) => [r.x / ppfOf(r.points_per_foot), r.y / ppfOf(r.points_per_foot)])];
    const minX = Math.min(...pts.map((p) => p[0])), minZ = Math.min(...pts.map((p) => p[1]));
    const maxX = Math.max(...pts.map((p) => p[0])), maxZ = Math.max(...pts.map((p) => p[1]));
    const at = /* @__PURE__ */ __name2((x, y, v) => ({ x: Math.round((x / ppfOf(v) - minX + offsetX) * 100) / 100 * FT, z: Math.round((y / ppfOf(v) - minZ) * 100) / 100 * FT }), "at");
    const bld = {
      sheet: b.sheet,
      page: b.page,
      title: info.title || null,
      scale: scaled ? (info.scales || []).join(", ") : null,
      to_scale: scaled,
      origin_x: offsetX,
      width_ft: Math.round(maxX - minX),
      depth_ft: Math.round(maxZ - minZ),
      rooms: rooms.map((r) => ({ number: r.number, name: r.name, corridor: !!r.corridor, ...at(r.x, r.y, r.points_per_foot) }))
    };
    buildings.push(bld);
    for (const t of b.tags) {
      const pos = at(t.x, t.y, t.points_per_foot);
      const room = t.room != null || t.room_name ? bld.rooms.find((r) => r.number === t.room && r.name === t.room_name) : null;
      const k = nk(t.mark) + "|" + (t.door_pages || []).join(",");
      const entry = {
        sheet: t.sheet,
        page: t.page,
        x: pos.x,
        z: pos.z,
        room: t.room,
        room_name: t.room_name,
        room_by: t.room_by,
        unsure: !!t.unsure,
        also_on: t.also_on || [],
        room_x: room ? room.x : null,
        room_z: room ? room.z : null,
        building: buildings.length - 1,
        ...t.shared_mark ? { shared_mark: t.shared_mark, note: t.note || "shared mark, order assumed" } : {}
      };
      if (t.shared_mark && placed.has(k) && placed.get(k)[0].shared_mark) placed.get(k).push(entry);
      else placed.set(k, [entry]);
    }
    offsetX += maxX - minX + 40;
  }
  let onPlan = 0;
  for (const d of model.doors) {
    const key = [...placed.keys()].find((k) => k.split("|")[0] === nk(d.mark) && (d.source_page == null || k.split("|")[1] === "" || k.split("|")[1] === "null" || k.split("|")[1].split(",").includes(String(d.source_page))));
    if (!key) continue;
    const list2 = placed.get(key);
    const entry = list2.length && list2[0].shared_mark ? list2.shift() : list2[0];
    if (entry) {
      d.plan = entry;
      onPlan++;
    }
  }
  const off = model.doors.filter((d) => !d.plan).map((d) => d.mark);
  model.layout = {
    source: "plan",
    buildings,
    counts: { doors: model.doors.length, on_plan: onPlan, rooms: buildings.reduce((n, b) => n + b.rooms.length, 0), corridors: buildings.reduce((n, b) => n + b.rooms.filter((r) => r.corridor).length, 0), unmatched_tags: (plan.unmatched_tags || []).length },
    unmatched_tags: (plan.unmatched_tags || []).map((u) => ({ tag: u.tag, sheet: u.sheet, page: u.page })),
    not_on_plan: off,
    note: "Laid out from the floor plan" + (buildings.length > 1 ? "s" : "") + " " + buildings.map((b) => b.sheet + (b.title ? " (" + b.title + ")" : "") + " p." + b.page).join(", ") + ": each door stands where its tag is drawn, in the room the plan gives it" + (buildings.some((b) => !b.to_scale) ? `; a sheet with no printed scale is drawn at 1/8" = 1'-0" and says so` : ", at the sheet's printed scale") + ". Walls and door swings are not read from the plan yet." + (off.length ? " Not tagged on any plan sheet: " + off.join(", ") + "." : "")
  };
  return model;
}
__name(attachPlan, "attachPlan");
__name2(attachPlan, "attachPlan");
var SETS = {
  "7478006f7fd5b43c": { "project": "_R2502-01 Final Bid Plans", "source": "harvested-set", "doors": [{ "mark": "01", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 88, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 32, "row": { "page": 32, "text": `01 A-122 PT101 EXISTING HM-1(PR) 8' - 0" 7' - 4" 1 3/4" TYP-1 3/A-602 6/A-602 8/A-602 09.08`, "index": 0 } }, { "mark": "101A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 109.11, "z": 33.78, "room": "101", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 108.56, "room_z": 20.78, "building": 0 }, "row": { "page": 45, "text": `101A DORM 101 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 1 } }, { "mark": "101B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 112.56, "z": 32.11, "room": "101", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 108.56, "room_z": 20.78, "building": 0 }, "row": { "page": 45, "text": `101B RESTROOM 101B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 3 } }, { "mark": "201B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 294.89, "z": 66.11, "room": "201", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 303.22, "room_z": 72.67, "building": 1 }, "row": { "page": 45, "text": `201B RESTROOM 201B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 EXP. DATE: 12/31/25`, "index": 4 } }, { "mark": "102", "location": null, "type": null, "material": null, "width_in": 30, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `102 LAUNDRY ROOM 102 WD-1 2' - 6" 6' - 8" 1 3/4" EXIST N/A N/A N/A 05.01 1&2`, "index": 5 } }, { "mark": "202A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 288.44, "z": 69.33, "room": "202", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 273.56, "room_z": 65.56, "building": 1 }, "row": { "page": 45, "text": `202A DORM 202 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 6 } }, { "mark": "103A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 121.67, "z": 33.67, "room": "103", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 122, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `103A DORM 103 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 7 } }, { "mark": "103B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 120.78, "z": 31.89, "room": "103", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 122, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `103B RESTROOM 101B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 8 } }, { "mark": "203A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 294.44, "z": 82.11, "room": "203", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 303.22, "room_z": 79.44, "building": 1 }, "row": { "page": 45, "text": `203A DORM 203 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 9 } }, { "mark": "104A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 126.33, "z": 38.67, "room": "104", "room_name": "SINGLE BEDROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.67, "room_z": 54.78, "building": 0 }, "row": { "page": 45, "text": `104A SINGLE BEDROOM 104A WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 10 } }, { "mark": "203B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 294.89, "z": 83.56, "room": "203", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 303.22, "room_z": 79.44, "building": 1 }, "row": { "page": 45, "text": `203B RESTROOM 203B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 11 } }, { "mark": "104B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 136.67, "z": 41.44, "room": "104", "room_name": "SINGLE BEDROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.67, "room_z": 54.78, "building": 0 }, "row": { "page": 45, "text": `104B PRIVATE BATH 104B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 12 } }, { "mark": "104C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 132.22, "z": 45.67, "room": "104", "room_name": "SINGLE BEDROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.67, "room_z": 54.78, "building": 0 }, "row": { "page": 45, "text": `104C SINGLE BEDROOM 104 WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 3`, "index": 14 } }, { "mark": "104D", "location": null, "type": null, "material": null, "width_in": 40, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 143.33, "z": 48.22, "room": "104", "room_name": "SINGLE BEDROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.67, "room_z": 54.78, "building": 0 }, "row": { "page": 45, "text": `104D CLOSET 104 WD-2 (PR) 3' - 4" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 04.02 3`, "index": 16 } }, { "mark": "104E", "location": null, "type": null, "material": null, "width_in": 40, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 126.44, "z": 48.22, "room": "104", "room_name": "SINGLE BEDROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.67, "room_z": 54.78, "building": 0 }, "row": { "page": 45, "text": `104E CLOSET 104 WD-2 (PR) 3' - 4" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 04.02 3`, "index": 17 } }, { "mark": "105A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 134.89, "z": 33.67, "room": "105", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.33, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `105A DORM 105 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 18 } }, { "mark": "105B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 138.11, "z": 32.33, "room": "105", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 134.33, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `105B RESTROOM 105B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 19 } }, { "mark": "206B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 285.22, "z": 109.89, "room": "206", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 273.56, "room_z": 105.11, "building": 1 }, "row": { "page": 45, "text": `206B RESTROOM 206B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 20 } }, { "mark": "107A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 147.33, "z": 33.67, "room": "107", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 147.22, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `107A DORM 107 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 21 } }, { "mark": "107B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 146.67, "z": 32.33, "room": "107", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 147.22, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `107B RESTROOM 105B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 22 } }, { "mark": "207B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 295.11, "z": 109.89, "room": "207", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 304.11, "room_z": 103.78, "building": 1 }, "row": { "page": 45, "text": `207B RESTROOM 207B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 23 } }, { "mark": "109A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 160.67, "z": 33.67, "room": "109", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 160.44, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `109A DORM 109 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 24 } }, { "mark": "109B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 164.22, "z": 32.11, "room": "109", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 160.44, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `109B RESTROOM 109B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 25 } }, { "mark": "208B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 285.33, "z": 116.78, "room": "208", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 273.56, "room_z": 121.44, "building": 1 }, "row": { "page": 45, "text": `208B RESTROOM 206B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 MICHAEL S. SUNDERMEYER`, "index": 26 } }, { "mark": "110", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 164.78, "z": 38.22, "room": "109B", "room_name": "EXIST RR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 160.44, "room_z": 28.56, "building": 0 }, "row": { "page": 45, "text": `110 STORAGE 110 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.05 1`, "index": 27 } }, { "mark": "111A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 173, "z": 33.67, "room": "111", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 173.22, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `111A DORM 111 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 28 } }, { "mark": "111B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 172.44, "z": 32.11, "room": "111", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 173.22, "room_z": 20.89, "building": 0 }, "row": { "page": 45, "text": `111B RESTROOM 109B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 29 } }, { "mark": "210A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 277.56, "z": 15.67, "room": "210", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 278, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `210A DORM 210 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 30 } }, { "mark": "112A", "location": null, "type": null, "material": null, "width_in": 72, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 96.11, "z": 12.33, "room": "112", "room_name": "VESTIBULE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 96.67, "room_z": 15.67, "building": 0 }, "row": { "page": 45, "text": `112A VESTIBULE 112 AL-1 (PR) 6' - 0" 7' - 0" 1 3/4" GLZ-A 10/A602 12/A602 9/A602 01.02 4`, "index": 31 } }, { "mark": "112B", "location": null, "type": null, "material": null, "width_in": 72, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 96.11, "z": 19.78, "room": "112", "room_name": "VESTIBULE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 96.67, "room_z": 15.67, "building": 0 }, "row": { "page": 45, "text": `112B VESTIBULE 112 AL-1 (PR) 6' - 0" 7' - 0" 1 3/4" GLZ-B 12/A602 SIM 14/A602 04.01`, "index": 33 } }, { "mark": "211A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 277.56, "z": 21.44, "room": "211", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 278, "room_z": 35.44, "building": 1 }, "row": { "page": 45, "text": `211A DORM 211 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 34 } }, { "mark": "113", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 104, "z": 41, "room": "113", "room_name": "KITCHENETTE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 106.89, "room_z": 50.78, "building": 0 }, "row": { "page": 45, "text": `113 KITCHENETE 113 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 08.02 1`, "index": 35 } }, { "mark": "114", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 96.22, "z": 45.44, "room": "113", "room_name": "KITCHENETTE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 106.89, "room_z": 50.78, "building": 0 }, "row": { "page": 45, "text": `114 STORAGE 114 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.02 1`, "index": 36 } }, { "mark": "115", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 84.11, "z": 57.89, "room": "117", "room_name": "OFFICE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 71.44, "room_z": 55.56, "building": 0 }, "row": { "page": 45, "text": `115 UNISEX RESTROOM 115 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.02 1&2`, "index": 37 } }, { "mark": "212B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 269.11, "z": 14.22, "room": "212", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 264.89, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `212B RESTROOM 210B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 38 } }, { "mark": "116", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 85.11, "z": 53.44, "room": "114", "room_name": "STORAGE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 97.89, "room_z": 58.56, "building": 0 }, "row": { "page": 45, "text": `116 JANITOR CLOSET 116 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.01 1&2`, "index": 39 } }, { "mark": "213A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 265.22, "z": 21.44, "room": "213", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 264.89, "room_z": 35.44, "building": 1 }, "row": { "page": 45, "text": `213A DORM 213 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 40 } }, { "mark": "117", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 80.67, "z": 52.44, "room": "117", "room_name": "OFFICE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 71.44, "room_z": 55.56, "building": 0 }, "row": { "page": 45, "text": `117 OFFICE 117 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 41 } }, { "mark": "213B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 269.11, "z": 24.11, "room": "213", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 264.89, "room_z": 35.44, "building": 1 }, "row": { "page": 45, "text": `213B RESTROOM 211B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 42 } }, { "mark": "118", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 80.67, "z": 41.44, "room": "118", "room_name": "OFFICE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 72.44, "room_z": 44.78, "building": 0 }, "row": { "page": 45, "text": `118 OFFICE 118 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 43 } }, { "mark": "214A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 251.89, "z": 15.67, "room": "214", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 252.33, "room_z": 3.33, "building": 1 }, "row": { "page": 45, "text": `214A DORM 214 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 44 } }, { "mark": "119", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 83, "z": 33.89, "room": "131", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 72.44, "room_z": 37, "building": 0 }, "row": { "page": 45, "text": `119 CONFERENCE ROOM 119 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 08.01`, "index": 45 } }, { "mark": "214B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 250.44, "z": 14.33, "room": "214", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 252.33, "room_z": 3.33, "building": 1 }, "row": { "page": 45, "text": `214B RESTROOM 214B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 46 } }, { "mark": "120A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 74.78, "z": 33.89, "room": "120", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 71.11, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `120A OFFICE 120 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 47 } }, { "mark": "215A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 256.33, "z": 21.44, "room": "215", "room_name": "PRIVATE DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 250.33, "room_z": 35.78, "building": 1 }, "row": { "page": 45, "text": `215A PRIVATE DORM 215 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.02`, "index": 48 } }, { "mark": "120B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 70.33, "z": 32, "room": "120", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 71.11, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `120B RESTROOM 120B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 49 } }, { "mark": "121", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 61.89, "z": 38.56, "room": "131", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 72.44, "room_z": 37, "building": 0 }, "row": { "page": 45, "text": `121 CONFERENCE ROOM 121 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 08.01`, "index": 50 } }, { "mark": "216A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 239.56, "z": 15.67, "room": "216", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 238.89, "room_z": 3.33, "building": 1 }, "row": { "page": 45, "text": `216A DORM 216 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 51 } }, { "mark": "122A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 53.44, "z": 33.89, "room": "122", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 57.56, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `122A OFFICE 122 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 52 } }, { "mark": "216B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 243.56, "z": 14.33, "room": "216", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 238.89, "room_z": 3.33, "building": 1 }, "row": { "page": 45, "text": `216B RESTROOM 214B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 53 } }, { "mark": "122B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 60.67, "z": 32, "room": "122", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 57.56, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `122B RESTROOM 120B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 54 } }, { "mark": "123A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 49.11, "z": 33.89, "room": "123", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 45.56, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `123A OFFICE 123 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 55 } }, { "mark": "217B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 225.11, "z": 24.11, "room": "217", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 226.33, "room_z": 35.78, "building": 1 }, "row": { "page": 45, "text": `217B RESTROOM 217B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 56 } }, { "mark": "123B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 44.33, "z": 32, "room": "123", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 45.56, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `123B RESTROOM 123B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 57 } }, { "mark": "124", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 32.11, "z": 43.56, "room": "124", "room_name": "EXIST STORAGE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 34.22, "room_z": 50.67, "building": 0 }, "row": { "page": 45, "text": `124 STORAGE 124 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.06 1`, "index": 58 } }, { "mark": "125A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 27.89, "z": 33.89, "room": "125", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 31.89, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `125A OFFICE 125 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 59 } }, { "mark": "219A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 214.33, "z": 21.44, "room": "219", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 213.22, "room_z": 35.78, "building": 1 }, "row": { "page": 45, "text": `219A DORM 219 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 60 } }, { "mark": "125B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 35.11, "z": 32, "room": "125", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 31.89, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `125B RESTROOM 125B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 61 } }, { "mark": "126A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 23.44, "z": 33.89, "room": "126", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 20.22, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `126A OFFICE 126 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 62 } }, { "mark": "220A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 213.89, "z": 15.67, "room": "220", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 213.22, "room_z": 3.33, "building": 1 }, "row": { "page": 45, "text": `220A DORM 220 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 63 } }, { "mark": "126B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 19, "z": 32, "room": "126", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 20.22, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `126B RESTROOM 126B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 64 } }, { "mark": "127", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 10.11, "z": 38.56, "room": "130", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 20.67, "room_z": 37, "building": 0 }, "row": { "page": 45, "text": `127 CLASSROOM 127 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 08.03`, "index": 65 } }, { "mark": "221A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 316.56, "z": 15.89, "room": "221", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 316.11, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `221A DORM 221 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 66 } }, { "mark": "128A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 2.44, "z": 33.78, "room": "128", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 6.44, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `128A OFFICE 128 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 67 } }, { "mark": "221B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 320.33, "z": 14.11, "room": "221", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 316.11, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `221B RESTROOM 221\`B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 68 } }, { "mark": "128B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 9.44, "z": 32, "room": "128", "room_name": "OFFICE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 6.44, "room_z": 21.56, "building": 0 }, "row": { "page": 45, "text": `128B RESTROOM 126B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 69 } }, { "mark": "129A", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 100.56, "z": 71.89, "room": "129", "room_name": "EXIST MECHANICAL", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 88.56, "room_z": 98.78, "building": 0 }, "row": { "page": 45, "text": `129A MECHANICAL ROOM 129 HM-1 (PR) 8' - 0" 7' - 0" 1 3/4" TYP-1 SIM. 3/A602 7/A602 8/A602 05.04`, "index": 70 } }, { "mark": "222B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 320.56, "z": 24.22, "room": "222", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 316.67, "room_z": 35.44, "building": 1 }, "row": { "page": 45, "text": `222B RESTROOM 222B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 71 } }, { "mark": "130C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 40.33, "z": 36.22, "room": "130", "room_name": "CORRIDOR", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 20.67, "room_z": 37, "building": 0 }, "row": { "page": 45, "text": `130C CORRIDOR 130 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02A`, "index": 72 } }, { "mark": "226A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 337.67, "z": 21.33, "room": "226", "room_name": "ACCESSIBILE DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 344.11, "room_z": 36.89, "building": 1 }, "row": { "page": 45, "text": `226A ACCESSIBLE DORM 226 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.02 1 MANAGEMENT,`, "index": 73 } }, { "mark": "133C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-105", "page": 23, "x": 125.22, "z": 36, "room": "133", "room_name": "CORRIDOR", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 147.44, "room_z": 36.78, "building": 0 }, "row": { "page": 45, "text": `133C CORRIDOR 133 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02A`, "index": 74 } }, { "mark": "227B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 353.33, "z": 14.11, "room": "227", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 355.78, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `227B RESTROOM 225B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 75 } }, { "mark": "229A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 367.89, "z": 15.89, "room": "229", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 367.11, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `229A DORM 229 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 76 } }, { "mark": "229B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 371.67, "z": 14.33, "room": "229", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 367.11, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `229B RESTROOM 229B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 MISSOURI STATE`, "index": 77 } }, { "mark": "231A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 380.22, "z": 15.89, "room": "231", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 380.56, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `231A DORM 231 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 78 } }, { "mark": "231B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 379.11, "z": 14.33, "room": "231", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 380.56, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `231B RESTROOM 229B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 79 } }, { "mark": "232A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 307.56, "z": 15.67, "room": "232", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 303.33, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `232A LIVING ROOM 232 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.03 RENOVATIONS TO`, "index": 80 } }, { "mark": "232B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 294.56, "z": 5.67, "room": "232", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 303.33, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `232B RESTROOM 232B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2 INTERIOR/EXTERIOR & INSTALL`, "index": 81 } }, { "mark": "232C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 298.78, "z": 4.11, "room": "232", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 303.33, "room_z": 3.67, "building": 1 }, "row": { "page": 45, "text": `232C BEDROOM 232 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 EMERGENCY GENERATOR,`, "index": 82 } }, { "mark": "234", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 307.67, "z": 22.22, "room": "234", "room_name": "UNISEX RR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 304.44, "room_z": 29, "building": 1 }, "row": { "page": 45, "text": `234 UNISEX RESTROOM 234 WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3 MSHP GENERAL`, "index": 83 } }, { "mark": "235B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 359, "z": 21.44, "room": "235", "room_name": "AREA OF REFUGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 348, "room_z": 19.22, "building": 1 }, "row": { "page": 45, "text": `235B CORRIDOR 240 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02`, "index": 84 } }, { "mark": "236", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 291.56, "z": 38.22, "room": "236", "room_name": "JAN. CL.", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 294.33, "room_z": 35.44, "building": 1 }, "row": { "page": 45, "text": `236 JANITOR CLOSET 236 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.03 1&2 1510 E. ELM STREET`, "index": 85 } }, { "mark": "237", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 294.78, "z": 51.33, "room": "237", "room_name": "EXIST CLEAN LINEN", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 300.56, "room_z": 51.67, "building": 1 }, "row": { "page": 45, "text": `237 CLEAN LINEN 237 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.04 1&2 JEFFERSON CITY, MO 65101`, "index": 86 } }, { "mark": "238", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 282.78, "z": 96.33, "room": "239", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 289.78, "room_z": 98.89, "building": 1 }, "row": { "page": 45, "text": `238 STORAGE 238 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.02 1`, "index": 87 } }, { "mark": "239A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 286, "z": 53.33, "room": "239", "room_name": "CORRIDOR", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 289.78, "room_z": 98.89, "building": 1 }, "row": { "page": 45, "text": `239A CORRIDOR 239 AL-1 3' - 0" 7' - 0" 1 3/4" GLZ-C 10/A602 11/A602 9/A602 3/4 HR 01.01 4`, "index": 88 } }, { "mark": "239B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "plan": { "sheet": "A-106", "page": 24, "x": 289.22, "z": 126.44, "room": "239", "room_name": "CORRIDOR", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 289.78, "room_z": 98.89, "building": 1 }, "row": { "page": 45, "text": `239B CORRIDOR 239 AL-1 3' - 0" 7' - 0" 1 3/4" GLZ-D 10/A602 SIM. 13/A602 9/A602 3/4 HR 01.01 4`, "index": 89 } }, { "mark": "301A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.33, "z": 69.33, "room": "301", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 71.22, "building": 2 }, "row": { "page": 46, "text": `301A DORM 301 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 90 } }, { "mark": "301B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.89, "z": 66, "room": "301", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 71.22, "building": 2 }, "row": { "page": 46, "text": `301B RESTROOM 301B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 91 } }, { "mark": "302A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 566.11, "z": 69.78, "room": "302", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.89, "room_z": 67.11, "building": 2 }, "row": { "page": 46, "text": `302A DORM 302 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 92 } }, { "mark": "302B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 562.89, "z": 71.89, "room": "302", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.89, "room_z": 67.11, "building": 2 }, "row": { "page": 46, "text": `302B RESTROOM 302B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 93 } }, { "mark": "303A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.44, "z": 82.67, "room": "303", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 79.78, "building": 2 }, "row": { "page": 46, "text": `303A DORM 303 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 94 } }, { "mark": "303B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.89, "z": 84.56, "room": "303", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 79.78, "building": 2 }, "row": { "page": 46, "text": `303B RESTROOM 303B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 95 } }, { "mark": "304A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 566.22, "z": 82.11, "room": "304", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.89, "room_z": 82.33, "building": 2 }, "row": { "page": 46, "text": `304A DORM 304 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 96 } }, { "mark": "304B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 562.89, "z": 78.78, "room": "304", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.89, "room_z": 82.33, "building": 2 }, "row": { "page": 46, "text": `304B RESTROOM 302B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 EQ. EQ.`, "index": 97 } }, { "mark": "305A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.22, "z": 95, "room": "305", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 95.44, "building": 2 }, "row": { "page": 46, "text": `305A DORM 305 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 10"`, "index": 98 } }, { "mark": "305B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.89, "z": 91.78, "room": "305", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 95.44, "building": 2 }, "row": { "page": 46, "text": `305B RESTROOM 303B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 99 } }, { "mark": "306A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 566.33, "z": 108.33, "room": "306", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.78, "room_z": 105.56, "building": 2 }, "row": { "page": 46, "text": `306A DORM 306 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 100 } }, { "mark": "306B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 563, "z": 110.33, "room": "306", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.78, "room_z": 105.56, "building": 2 }, "row": { "page": 46, "text": `306B RESTROOM 306B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 WD-1: FLUSH - WOOD AL-1: FULL GLASS-ALUMINUM HM-2: VISION LITE-HOLLOW METAL WD-2: LOUVER - WOOD TYPE-1: HOLLOW METAL TYPE-2: HOLLOW METAL`, "index": 101 } }, { "mark": "307A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572, "z": 108.33, "room": "307", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 105.89, "building": 2 }, "row": { "page": 46, "text": `307A DORM 307 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 HM-1: FLUSH - HOLLOW METAL 12/16/2025`, "index": 102 } }, { "mark": "307B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.78, "z": 110.11, "room": "307", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 105.89, "building": 2 }, "row": { "page": 46, "text": `307B RESTROOM 307B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 103 } }, { "mark": "308A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 566.33, "z": 120.67, "room": "308", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.78, "room_z": 121.56, "building": 2 }, "row": { "page": 46, "text": `308A DORM 308 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 104 } }, { "mark": "308B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 563, "z": 117.56, "room": "308", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.78, "room_z": 121.56, "building": 2 }, "row": { "page": 46, "text": `308B RESTROOM 306B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 105 } }, { "mark": "309A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.22, "z": 120.22, "room": "309", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 121.56, "building": 2 }, "row": { "page": 46, "text": `309A DORM 309 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 EXP. DATE: 12/31/26`, "index": 106 } }, { "mark": "309B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.78, "z": 117.56, "room": "309", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582.11, "room_z": 121.56, "building": 2 }, "row": { "page": 46, "text": `309B RESTROOM 307B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 A-602 SCALE: 1/4" = 1'-0" A-602 SCALE: 1/4" = 1'-0"`, "index": 107 } }, { "mark": "310A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 555.33, "z": 15.89, "room": "310", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 555.44, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `310A DORM 310 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 108 } }, { "mark": "310B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 554, "z": 14.67, "room": "310", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 555.44, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `310B RESTROOM 310B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 109 } }, { "mark": "311A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 555.44, "z": 22.11, "room": "311", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 555.44, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `311A DORM 311 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 110 } }, { "mark": "311B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 554.33, "z": 24.44, "room": "311", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 555.44, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `311B RESTROOM 311B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 111 } }, { "mark": "312A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 543, "z": 15.89, "room": "312", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 542.89, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `312A DORM 312 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 MASONRY WITH`, "index": 112 } }, { "mark": "312B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 547, "z": 14.67, "room": "312", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 542.89, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `312B RESTROOM 310B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 STEEL LINTEL`, "index": 113 } }, { "mark": "313A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 543.11, "z": 21.89, "room": "313", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 542.89, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `313A DORM 313 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 114 } }, { "mark": "313B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 546.89, "z": 24.44, "room": "313", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 542.89, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `313B RESTROOM 311B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 115 } }, { "mark": "314A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 529.67, "z": 15.89, "room": "314", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 529.89, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `314A DORM 314 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 STUD BOX HEADER`, "index": 116 } }, { "mark": "314B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 528.44, "z": 14.56, "room": "314", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 529.89, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `314B RESTROOM 314B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 5/8" SEALANT @ INTERIOR STUD WALL, AS`, "index": 117 } }, { "mark": "315A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 534.22, "z": 22, "room": "315", "room_name": "ACCESSIBLE DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 528.22, "room_z": 38.44, "building": 2 }, "row": { "page": 46, "text": `315A ACCESSIBLE DORM 315 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.02 SCHEDULED`, "index": 118 } }, { "mark": "315B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 528.56, "z": 29.11, "room": "315", "room_name": "ACCESSIBLE DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 528.22, "room_z": 38.44, "building": 2 }, "row": { "page": 46, "text": `315B ACCESSIBLE RESTROOM 315B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 119 } }, { "mark": "316A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 517.44, "z": 15.89, "room": "316", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 516.67, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `316A DORM 316 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 SIDES)`, "index": 120 } }, { "mark": "316B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 521.33, "z": 14.56, "room": "316", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 516.67, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `316B RESTROOM 314B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 2" H.M. DOOR FRAME PER 11 5/8"`, "index": 121 } }, { "mark": "317A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 504.11, "z": 22.11, "room": "317", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 504.33, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `317A DORM 317 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 PRE-FINISHED METAL DOOR SCHEDULE V.I.F.`, "index": 122 } }, { "mark": "317B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 503, "z": 24.67, "room": "317", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 504.33, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `317B RESTROOM 317B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 FLASHING W/ DRIP.`, "index": 123 } }, { "mark": "318A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 504, "z": 15.89, "room": "318", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 504.33, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `318A DORM 318 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 REFER TO SPECS.`, "index": 124 } }, { "mark": "318B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 502.78, "z": 14.56, "room": "318", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 504.33, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `318B RESTROOM 318B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 125 } }, { "mark": "319A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 492.22, "z": 22.11, "room": "319", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 492, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `319A DORM 319 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 1/2" 5 3/4" VARIES`, "index": 126 } }, { "mark": "319B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 495.67, "z": 24.67, "room": "319", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 492, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `319B RESTROOM 317B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 127 } }, { "mark": "320A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 491.67, "z": 15.89, "room": "320", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 491.56, "room_z": 4.44, "building": 2 }, "row": { "page": 46, "text": `320A DORM 320 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 128 } }, { "mark": "321B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 598.33, "z": 14.56, "room": "321", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 594, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `321B RESTROOM 321B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 A-602 SCALE: 1 1/2" = 1'-0" A-602 SCALE: 1 1/2" = 1'-0" GROUT`, "index": 129 } }, { "mark": "322A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 594.44, "z": 21.67, "room": "322", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 594.78, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `322A DORM 322 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 130 } }, { "mark": "322B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 598.22, "z": 24.78, "room": "322", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 594.78, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `322B RESTROOM 322B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 131 } }, { "mark": "323A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 606.67, "z": 15.89, "room": "323", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 607.11, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `323A DORM 323 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 BACKER ROD (TYP. 8"`, "index": 132 } }, { "mark": "323B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 605.56, "z": 14.56, "room": "323", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 607.11, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `323B RESTROOM 321B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 2" WIRE ANCHOR`, "index": 133 } }, { "mark": "325A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 620, "z": 15.78, "room": "325", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 619.89, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `325A DORM 325 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 SHIM AS REQUIRED 5 3/4" DIVISION OF FACILITIES`, "index": 134 } }, { "mark": "326B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 621.11, "z": 29.11, "room": "326", "room_name": "ACCESSIBLE DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 621.44, "room_z": 38.67, "building": 2 }, "row": { "page": 46, "text": `326B ACCESSIBLE RESTROOM 326B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 135 } }, { "mark": "327A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 632.56, "z": 15.78, "room": "327", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 634.78, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `327A DORM 327 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 H.M. DOOR FRAME`, "index": 136 } }, { "mark": "327B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 631.22, "z": 14.67, "room": "327", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 634.78, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `327B RESTROOM 325B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 1/2" DOOR, AS SCHEDULED GROUT SOLID`, "index": 137 } }, { "mark": "328A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 645.78, "z": 21.89, "room": "328", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 645.56, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `328A DORM 328 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 DEPARTMENT OF`, "index": 138 } }, { "mark": "328B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 649.89, "z": 24.56, "room": "328", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 645.56, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `328B RESTROOM 328B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 139 } }, { "mark": "329A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 645.78, "z": 15.78, "room": "329", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 644.89, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `329A DORM 329 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 140 } }, { "mark": "330B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 656.44, "z": 24.56, "room": "330", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 658.56, "room_z": 36, "building": 2 }, "row": { "page": 46, "text": `330B RESTROOM 328B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 A-602 SCALE: 1 1/2" = 1'-0" A-602 SCALE: 1 1/2" = 1'-0" A-602 SCALE: 1 1/2" = 1'-0"`, "index": 141 } }, { "mark": "331A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 658.11, "z": 16.11, "room": "331", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 658.56, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `331A DORM 331 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 142 } }, { "mark": "331B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 656.89, "z": 14.67, "room": "331", "room_name": "EXIST DORM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 658.56, "room_z": 4.22, "building": 2 }, "row": { "page": 46, "text": `331B RESTROOM 329B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 143 } }, { "mark": "332A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 585.44, "z": 15.89, "room": "332", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582, "room_z": 11.22, "building": 2 }, "row": { "page": 46, "text": `332A LIVING ROOM 332 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.03`, "index": 144 } }, { "mark": "332B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.44, "z": 6.22, "room": "332", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582, "room_z": 11.22, "building": 2 }, "row": { "page": 46, "text": `332B RESTROOM 332B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2 INTERIOR/EXTERIOR & INSTALL`, "index": 145 } }, { "mark": "332C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 571.67, "z": 4.44, "room": "332", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582, "room_z": 11.22, "building": 2 }, "row": { "page": 46, "text": `332C BEDROOM 332C WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 3 EMERGENCY GENERATOR,`, "index": 146 } }, { "mark": "332D", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 581, "z": 4.44, "room": "332", "room_name": "LIVING ROOM", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 582, "room_z": 11.22, "building": 2 }, "row": { "page": 46, "text": `332D BEDROOM 332D WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 3 4 1/2" MULTIPLE ASSETS`, "index": 147 } }, { "mark": "333B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 517.11, "z": 22.11, "room": "333", "room_name": "AREA OF REFUGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 513.22, "room_z": 26.33, "building": 2 }, "row": { "page": 46, "text": `333B CORRIDOR 341 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02 STAINLESS STEEL FLAT HEAD ALUMINUM DOOR. MSHP GENERAL`, "index": 148 } }, { "mark": "334", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 585.56, "z": 22.56, "room": "334A", "room_name": "UNISEX RR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 582.22, "room_z": 27.67, "building": 2 }, "row": { "page": 46, "text": `334 UNISEX RESTROOM 334A WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.02 3 CONCRETE SCREW STAINLESS STEEL SEE SPECS. HEADQUARTERS COMPLEX`, "index": 149 } }, { "mark": "335B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 636.89, "z": 21.78, "room": "335", "room_name": "AREA OF REFUGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 633, "room_z": 26.33, "building": 2 }, "row": { "page": 46, "text": `335B CORRIDOR 341 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02 THRESHOLD SET IN 1/8" SEALANT JOINT`, "index": 150 } }, { "mark": "336A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 569.89, "z": 39, "room": "336", "room_name": "EXIST JAN. CL.", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 557.78, "room_z": 46.22, "building": 2 }, "row": { "page": 46, "text": `336A JANITOR CLOSET 336A WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.03 1&2`, "index": 151 } }, { "mark": "336B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 579.56, "z": 41.78, "room": "336", "room_name": "EXIST JAN. CL.", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 557.78, "room_z": 46.22, "building": 2 }, "row": { "page": 46, "text": `336B STORAGE 336B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 09.02 CONCRETE HEIGHT (TYP.)`, "index": 152 } }, { "mark": "337", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 572.33, "z": 51.78, "room": "337", "room_name": "EXIST CLEAN LINEN", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 580.11, "room_z": 52.89, "building": 2 }, "row": { "page": 46, "text": `337 CLEAN LINEN 337 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.04 1&2 CONCRETE SLAB FLOORING FINISH LEGEND`, "index": 153 } }, { "mark": "338B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 565.67, "z": 95.22, "room": "338", "room_name": "AREA OF REFUGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 551.89, "room_z": 86.33, "building": 2 }, "row": { "page": 46, "text": `338B CORRIDOR 340 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02 EXTERIOR INTERIOR EXTERIOR 1/2" INTERIOR`, "index": 154 } }, { "mark": "339", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 46, "plan": { "sheet": "A-107", "page": 25, "x": 560.78, "z": 96.78, "room": "340", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 567.67, "room_z": 93.22, "building": 2 }, "row": { "page": 46, "text": `339 STORAGE 339 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.02 1`, "index": 155 } }], "sets": {}, "notes": ["Real harvested bid set _R2502-01 Final Bid Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A-105", "page": 23, "title": "DORM FIRST FLOOR PLAN", "scale": `SCALE: 1/8" = 1'-0", SCALE: 1/8" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 173, "depth_ft": 99, "rooms": [{ "number": "112", "name": "VESTIBULE", "corridor": true, "x": 96.67, "z": 15.67 }, { "number": "101", "name": "EXIST DORM", "corridor": false, "x": 108.56, "z": 20.78 }, { "number": "103", "name": "EXIST DORM", "corridor": false, "x": 122, "z": 20.89 }, { "number": "105", "name": "EXIST DORM", "corridor": false, "x": 134.33, "z": 20.89 }, { "number": "107", "name": "EXIST DORM", "corridor": false, "x": 147.22, "z": 20.89 }, { "number": "109", "name": "EXIST DORM", "corridor": false, "x": 160.44, "z": 20.89 }, { "number": "111", "name": "EXIST DORM", "corridor": false, "x": 173.22, "z": 20.89 }, { "number": "128", "name": "OFFICE", "corridor": false, "x": 6.44, "z": 21.56 }, { "number": "126", "name": "OFFICE", "corridor": false, "x": 20.22, "z": 21.56 }, { "number": "125", "name": "OFFICE", "corridor": false, "x": 31.89, "z": 21.56 }, { "number": "123", "name": "OFFICE", "corridor": false, "x": 45.56, "z": 21.56 }, { "number": "122", "name": "OFFICE", "corridor": false, "x": 57.56, "z": 21.56 }, { "number": "120", "name": "OFFICE", "corridor": false, "x": 71.11, "z": 21.56 }, { "number": "119", "name": "CONFERENCE RM", "corridor": false, "x": 83.56, "z": 21.56 }, { "number": "134", "name": "LOBBY", "corridor": true, "x": 96.22, "z": 22.56 }, { "number": "126B", "name": "RR", "corridor": false, "x": 20.22, "z": 25.22 }, { "number": "A-401", "name": "ALL", "corridor": false, "x": 122.44, "z": 25.89 }, { "number": "123B", "name": "RR", "corridor": false, "x": 45.56, "z": 28.67 }, { "number": "120B", "name": "RR", "corridor": false, "x": 71, "z": 28.56 }, { "number": "101B", "name": "EXIST RR", "corridor": false, "x": 108.56, "z": 28.56 }, { "number": "105B", "name": "EXIST RR", "corridor": false, "x": 134.33, "z": 28.56 }, { "number": "109B", "name": "EXIST RR", "corridor": false, "x": 160.44, "z": 28.56 }, { "number": "130", "name": "CORRIDOR", "corridor": true, "x": 20.67, "z": 37 }, { "number": "131", "name": "CORRIDOR", "corridor": true, "x": 72.44, "z": 37 }, { "number": "132", "name": `DN F.F. 102'-0" CORRIDOR`, "corridor": true, "x": 116.56, "z": 36.67 }, { "number": "133", "name": "CORRIDOR", "corridor": true, "x": 147.44, "z": 36.78 }, { "number": "102", "name": `DN F.F. 102'-0" CORRIDOR`, "corridor": true, "x": 118.56, "z": 37.56 }, { "number": "104A", "name": "FOYER", "corridor": false, "x": 131.33, "z": 43.33 }, { "number": "104B", "name": "PRIVATE RR", "corridor": false, "x": 140, "z": 43.33 }, { "number": "118", "name": "OFFICE", "corridor": false, "x": 72.44, "z": 44.78 }, { "number": "127", "name": "EXIST CLASSROOM", "corridor": false, "x": 12.89, "z": 50.67 }, { "number": "124", "name": "EXIST STORAGE", "corridor": false, "x": 34.22, "z": 50.67 }, { "number": "121", "name": "CONFERENCE ROOM", "corridor": false, "x": 51.22, "z": 51 }, { "number": "113", "name": "KITCHENETTE", "corridor": false, "x": 106.89, "z": 50.78 }, { "number": "110", "name": "STORAGE", "corridor": false, "x": 163.78, "z": 51 }, { "number": "102", "name": "EXIST LAUNDRY ROOM", "corridor": false, "x": 117.44, "z": 52 }, { "number": "104", "name": "SINGLE BEDROOM", "corridor": false, "x": 134.67, "z": 54.78 }, { "number": "117", "name": "OFFICE", "corridor": false, "x": 71.44, "z": 55.56 }, { "number": "114", "name": "STORAGE", "corridor": false, "x": 97.89, "z": 58.56 }, { "number": "116", "name": "EXIST JANITOR RM", "corridor": false, "x": 71.44, "z": 64.89 }, { "number": "115", "name": "EXIST UNISEX RR", "corridor": false, "x": 71.11, "z": 70.78 }, { "number": "129", "name": "EXIST MECHANICAL", "corridor": false, "x": 88.56, "z": 98.78 }] }, { "sheet": "A-106", "page": 24, "title": "DORM SECOND FLOOR PLAN", "scale": `SCALE: 1/8" = 1'-0"`, "to_scale": true, "origin_x": 213.22222222222223, "width_ft": 238, "depth_ft": 126, "rooms": [{ "number": "232A", "name": "BEDROOM", "corridor": false, "x": 290.22, "z": 0 }, { "number": "220", "name": "EXIST DORM", "corridor": false, "x": 213.22, "z": 3.33 }, { "number": "218", "name": "EXIST DORM", "corridor": false, "x": 226.33, "z": 3.33 }, { "number": "216", "name": "EXIST DORM", "corridor": false, "x": 238.89, "z": 3.33 }, { "number": "214", "name": "EXIST DORM", "corridor": false, "x": 252.33, "z": 3.33 }, { "number": "212", "name": "EXIST DORM", "corridor": false, "x": 264.89, "z": 3.67 }, { "number": "210", "name": "EXIST DORM", "corridor": false, "x": 278, "z": 3.67 }, { "number": "232", "name": "LIVING ROOM", "corridor": false, "x": 303.33, "z": 3.67 }, { "number": "221", "name": "EXIST DORM", "corridor": false, "x": 316.11, "z": 3.67 }, { "number": "223", "name": "EXIST DORM", "corridor": false, "x": 329.44, "z": 3.67 }, { "number": "225", "name": "EXIST DORM", "corridor": false, "x": 341.11, "z": 3.67 }, { "number": "227", "name": "EXIST DORM", "corridor": false, "x": 355.78, "z": 3.67 }, { "number": "229", "name": "EXIST DORM", "corridor": false, "x": 367.11, "z": 3.67 }, { "number": "231", "name": "EXIST DORM", "corridor": false, "x": 380.56, "z": 3.67 }, { "number": "232B", "name": "RR", "corridor": false, "x": 290.78, "z": 8.67 }, { "number": "218B", "name": "EXIST RR", "corridor": false, "x": 226.33, "z": 10.67 }, { "number": "214B", "name": "EXIST RR", "corridor": false, "x": 252.33, "z": 10.67 }, { "number": "210B", "name": "EXIST RR", "corridor": false, "x": 278, "z": 10.67 }, { "number": "221B", "name": "EXIST RR", "corridor": false, "x": 316.11, "z": 10.67 }, { "number": "225B", "name": "EXIST RR", "corridor": false, "x": 341.11, "z": 10.67 }, { "number": "229B", "name": "EXIST RR", "corridor": false, "x": 367.11, "z": 10.67 }, { "number": "235", "name": "AREA OF REFUGE", "corridor": false, "x": 348, "z": 19.22 }, { "number": "240", "name": "CORRIDOR", "corridor": true, "x": 289, "z": 22.22 }, { "number": "233", "name": "AREA OF REFUGE", "corridor": false, "x": 235.22, "z": 25.89 }, { "number": "215B", "name": "RR", "corridor": false, "x": 247.67, "z": 25.67 }, { "number": "226B", "name": "EXIST ACCESSIBLE RR", "corridor": false, "x": 344.89, "z": 26.78 }, { "number": "217B", "name": "EXIST RR", "corridor": false, "x": 226.33, "z": 27.22 }, { "number": "211B", "name": "EXIST RR", "corridor": false, "x": 278, "z": 27.33 }, { "number": "222B", "name": "EXIST RR", "corridor": false, "x": 316.67, "z": 27.22 }, { "number": "228B", "name": "EXIST RR", "corridor": false, "x": 367.78, "z": 27.22 }, { "number": "234", "name": "UNISEX RR", "corridor": false, "x": 304.44, "z": 29 }, { "number": "219", "name": "EXIST DORM", "corridor": false, "x": 213.22, "z": 35.78 }, { "number": "217", "name": "EXIST DORM", "corridor": false, "x": 226.33, "z": 35.78 }, { "number": "215", "name": "PRIVATE DORM", "corridor": false, "x": 250.33, "z": 35.78 }, { "number": "213", "name": "EXIST DORM", "corridor": false, "x": 264.89, "z": 35.44 }, { "number": "211", "name": "EXIST DORM", "corridor": false, "x": 278, "z": 35.44 }, { "number": "236", "name": "JAN. CL.", "corridor": false, "x": 294.33, "z": 35.44 }, { "number": "222", "name": "EXIST DORM", "corridor": false, "x": 316.67, "z": 35.44 }, { "number": "224", "name": "EXIST DORM", "corridor": false, "x": 329.56, "z": 35.44 }, { "number": "228", "name": "EXIST DORM", "corridor": false, "x": 367.78, "z": 35.44 }, { "number": "230", "name": "EXIST DORM", "corridor": false, "x": 380.56, "z": 35.56 }, { "number": "226", "name": "ACCESSIBILE DORM", "corridor": false, "x": 344.11, "z": 36.89 }, { "number": "237", "name": "EXIST CLEAN LINEN", "corridor": false, "x": 300.56, "z": 51.67 }, { "number": "202", "name": "EXIST DORM", "corridor": false, "x": 273.56, "z": 65.56 }, { "number": "202B", "name": "EXIST RR", "corridor": false, "x": 273.56, "z": 68.67 }, { "number": "201B", "name": "EXIST RR", "corridor": false, "x": 303.22, "z": 69.22 }, { "number": "201", "name": "EXIST DORM", "corridor": false, "x": 303.22, "z": 72.67 }, { "number": "203", "name": "EXIST DORM", "corridor": false, "x": 303.22, "z": 79.44 }, { "number": "204", "name": "EXIST DORM", "corridor": false, "x": 273.56, "z": 81.78 }, { "number": "203B", "name": "EXIST RR", "corridor": false, "x": 303.22, "z": 82.78 }, { "number": "205", "name": "EXIST DORM", "corridor": false, "x": 304.11, "z": 95.33 }, { "number": "238", "name": "EXIST STORAGE", "corridor": false, "x": 273.56, "z": 98.89 }, { "number": "239", "name": "CORRIDOR", "corridor": true, "x": 289.78, "z": 98.89 }, { "number": "6001", "name": "PROJECT # R2502-01", "corridor": false, "x": 451.56, "z": 99.44 }, { "number": "207", "name": "EXIST DORM", "corridor": false, "x": 304.11, "z": 103.78 }, { "number": "206", "name": "EXIST DORM", "corridor": false, "x": 273.56, "z": 105.11 }, { "number": "207B", "name": "EXIST RR", "corridor": false, "x": 304.11, "z": 106.89 }, { "number": "206B", "name": "EXIST RR", "corridor": false, "x": 273.56, "z": 108.56 }, { "number": "208", "name": "EXIST DORM", "corridor": false, "x": 273.56, "z": 121.44 }, { "number": "209", "name": "EXIST DORM", "corridor": false, "x": 304.11, "z": 121.44 }] }, { "sheet": "A-107", "page": 25, "title": "DORM THIRD FLOOR PLAN", "scale": `SCALE: 1/8" = 1'-0"`, "to_scale": true, "origin_x": 491.5555555555556, "width_ft": 238, "depth_ft": 122, "rooms": [{ "number": "332C", "name": "BEDROOM", "corridor": false, "x": 567.56, "z": 0 }, { "number": "332D", "name": "BEDROOM", "corridor": false, "x": 582, "z": 0 }, { "number": "320", "name": "EXIST DORM", "corridor": false, "x": 491.56, "z": 4.44 }, { "number": "318", "name": "EXIST DORM", "corridor": false, "x": 504.33, "z": 4.44 }, { "number": "316", "name": "EXIST DORM", "corridor": false, "x": 516.67, "z": 4.44 }, { "number": "314", "name": "EXIST DORM", "corridor": false, "x": 529.89, "z": 4.44 }, { "number": "312", "name": "EXIST DORM", "corridor": false, "x": 542.89, "z": 4.44 }, { "number": "310", "name": "EXIST DORM", "corridor": false, "x": 555.44, "z": 4.22 }, { "number": "321", "name": "EXIST DORM", "corridor": false, "x": 594, "z": 4.22 }, { "number": "323", "name": "EXIST DORM", "corridor": false, "x": 607.11, "z": 4.22 }, { "number": "325", "name": "EXIST DORM", "corridor": false, "x": 619.89, "z": 4.22 }, { "number": "327", "name": "EXIST DORM", "corridor": false, "x": 634.78, "z": 4.22 }, { "number": "329", "name": "EXIST DORM", "corridor": false, "x": 644.89, "z": 4.22 }, { "number": "331", "name": "EXIST DORM", "corridor": false, "x": 658.56, "z": 4.22 }, { "number": "332B", "name": "RR", "corridor": false, "x": 568.22, "z": 9.22 }, { "number": "318B", "name": "EXIST RR", "corridor": false, "x": 504.33, "z": 11.22 }, { "number": "314B", "name": "EXIST RR", "corridor": false, "x": 529.89, "z": 11.22 }, { "number": "310B", "name": "EXIST RR", "corridor": false, "x": 555.44, "z": 11.22 }, { "number": "332", "name": "LIVING ROOM", "corridor": false, "x": 582, "z": 11.22 }, { "number": "321B", "name": "EXIST RR", "corridor": false, "x": 594, "z": 11.22 }, { "number": "325B", "name": "EXIST RR", "corridor": false, "x": 619.11, "z": 11.22 }, { "number": "329B", "name": "EXIST RR", "corridor": false, "x": 644.89, "z": 11.22 }, { "number": "07", "name": "OPP. 315A", "corridor": false, "x": 533.56, "z": 19.78 }, { "number": "341", "name": "CORRIDOR", "corridor": true, "x": 567.67, "z": 21.33 }, { "number": "326B", "name": "ACCESSIBLE RR", "corridor": false, "x": 624.11, "z": 25.89 }, { "number": "333", "name": "AREA OF REFUGE", "corridor": false, "x": 513.22, "z": 26.33 }, { "number": "315B", "name": "ACCESSIBLE RR", "corridor": false, "x": 526.22, "z": 26.33 }, { "number": "01", "name": "ACCESSIBLE RR", "corridor": false, "x": 620.78, "z": 26.11 }, { "number": "335", "name": "AREA OF REFUGE", "corridor": false, "x": 633, "z": 26.33 }, { "number": "317B", "name": "EXIST RR", "corridor": false, "x": 504.33, "z": 27.67 }, { "number": "311B", "name": "EXIST RR", "corridor": false, "x": 555.44, "z": 27.67 }, { "number": "334A", "name": "UNISEX RR", "corridor": false, "x": 582.22, "z": 27.67 }, { "number": "322B", "name": "EXIST RR", "corridor": false, "x": 594, "z": 27.67 }, { "number": "328B", "name": "EXIST RR", "corridor": false, "x": 645.56, "z": 27.67 }, { "number": "319", "name": "EXIST DORM", "corridor": false, "x": 492, "z": 36 }, { "number": "317", "name": "EXIST DORM", "corridor": false, "x": 504.33, "z": 36 }, { "number": "313", "name": "EXIST DORM", "corridor": false, "x": 542.89, "z": 36 }, { "number": "311", "name": "EXIST DORM", "corridor": false, "x": 555.44, "z": 36 }, { "number": "322", "name": "EXIST DORM", "corridor": false, "x": 594.78, "z": 36 }, { "number": "324", "name": "EXIST DORM", "corridor": false, "x": 606.56, "z": 36 }, { "number": "328", "name": "EXIST DORM", "corridor": false, "x": 645.56, "z": 36 }, { "number": "330", "name": "EXIST DORM", "corridor": false, "x": 658.56, "z": 36 }, { "number": "315", "name": "ACCESSIBLE DORM", "corridor": false, "x": 528.22, "z": 38.44 }, { "number": "326", "name": "ACCESSIBLE DORM", "corridor": false, "x": 621.44, "z": 38.67 }, { "number": "334B", "name": `2' - 7 5/8"STORAGE`, "corridor": false, "x": 594.56, "z": 39.67 }, { "number": "336", "name": "EXIST JAN. CL.", "corridor": false, "x": 557.78, "z": 46.22 }, { "number": "337", "name": "EXIST CLEAN LINEN", "corridor": false, "x": 580.11, "z": 52.89 }, { "number": "302", "name": "EXIST DORM", "corridor": false, "x": 551.89, "z": 67.11 }, { "number": "301B", "name": "EXIST RR", "corridor": false, "x": 582.11, "z": 68.11 }, { "number": "302B", "name": "EXIST RR", "corridor": false, "x": 551.89, "z": 70.11 }, { "number": "301", "name": "EXIST DORM", "corridor": false, "x": 582.11, "z": 71.22 }, { "number": "303", "name": "EXIST DORM", "corridor": false, "x": 582.11, "z": 79.78 }, { "number": "304", "name": "EXIST DORM", "corridor": false, "x": 551.89, "z": 82.33 }, { "number": "303B", "name": "EXIST RR", "corridor": false, "x": 582.11, "z": 82.89 }, { "number": "338", "name": "AREA OF REFUGE", "corridor": false, "x": 551.89, "z": 86.33 }, { "number": "340", "name": "CORRIDOR", "corridor": true, "x": 567.67, "z": 93.22 }, { "number": "305", "name": "EXIST DORM", "corridor": false, "x": 582.11, "z": 95.44 }, { "number": "339", "name": "EXIST STORAGE", "corridor": false, "x": 551.78, "z": 99.11 }, { "number": "6001", "name": "PROJECT # R2502-01", "corridor": false, "x": 729.44, "z": 99.89 }, { "number": "306", "name": "EXIST DORM", "corridor": false, "x": 551.78, "z": 105.56 }, { "number": "307", "name": "EXIST DORM", "corridor": false, "x": 582.11, "z": 105.89 }, { "number": "306B", "name": "EXIST RR", "corridor": false, "x": 551.78, "z": 108.56 }, { "number": "307B", "name": "EXIST RR", "corridor": false, "x": 582.11, "z": 108.78 }, { "number": "308", "name": "EXIST DORM", "corridor": false, "x": 551.78, "z": 121.56 }, { "number": "309", "name": "EXIST DORM", "corridor": false, "x": 582.11, "z": 121.56 }] }], "counts": { "doors": 152, "on_plan": 150, "rooms": 167, "corridors": 11, "unmatched_tags": 45 }, "unmatched_tags": [{ "tag": "5", "sheet": "A-105", "page": 23 }, { "tag": "6", "sheet": "A-105", "page": 23 }, { "tag": "7", "sheet": "A-105", "page": 23 }, { "tag": "8", "sheet": "A-105", "page": 23 }, { "tag": "9", "sheet": "A-105", "page": 23 }, { "tag": "130B", "sheet": "A-105", "page": 23 }, { "tag": "133B", "sheet": "A-105", "page": 23 }, { "tag": "129B", "sheet": "A-105", "page": 23 }, { "tag": "129F", "sheet": "A-105", "page": 23 }, { "tag": "129D", "sheet": "A-105", "page": 23 }, { "tag": "5", "sheet": "A-106", "page": 24 }, { "tag": "6", "sheet": "A-106", "page": 24 }, { "tag": "7", "sheet": "A-106", "page": 24 }, { "tag": "8", "sheet": "A-106", "page": 24 }, { "tag": "9", "sheet": "A-106", "page": 24 }, { "tag": "218A", "sheet": "A-106", "page": 24 }, { "tag": "217A", "sheet": "A-106", "page": 24 }, { "tag": "233B", "sheet": "A-106", "page": 24 }, { "tag": "233A", "sheet": "A-106", "page": 24 }, { "tag": "212A", "sheet": "A-106", "page": 24 }, { "tag": "223A", "sheet": "A-106", "page": 24 }, { "tag": "225A", "sheet": "A-106", "page": 24 }, { "tag": "227A", "sheet": "A-106", "page": 24 }, { "tag": "222A", "sheet": "A-106", "page": 24 }, { "tag": "224A", "sheet": "A-106", "page": 24 }, { "tag": "228A", "sheet": "A-106", "page": 24 }, { "tag": "230A", "sheet": "A-106", "page": 24 }, { "tag": "235A", "sheet": "A-106", "page": 24 }, { "tag": "239D", "sheet": "A-106", "page": 24 }, { "tag": "204B", "sheet": "A-106", "page": 24 }, { "tag": "205B", "sheet": "A-106", "page": 24 }, { "tag": "209B", "sheet": "A-106", "page": 24 }, { "tag": "5", "sheet": "A-107", "page": 25 }, { "tag": "6", "sheet": "A-107", "page": 25 }, { "tag": "7", "sheet": "A-107", "page": 25 }, { "tag": "8", "sheet": "A-107", "page": 25 }, { "tag": "9", "sheet": "A-107", "page": 25 }, { "tag": "333A", "sheet": "A-107", "page": 25 }, { "tag": "321A", "sheet": "A-107", "page": 25 }, { "tag": "324A", "sheet": "A-107", "page": 25 }, { "tag": "326A", "sheet": "A-107", "page": 25 }, { "tag": "330A", "sheet": "A-107", "page": 25 }, { "tag": "335A", "sheet": "A-107", "page": 25 }, { "tag": "8", "sheet": "A-112", "page": 28 }, { "tag": "8", "sheet": "A-112", "page": 28 }], "not_on_plan": ["01", "102"], "note": "Laid out from the floor plans A-105 (DORM FIRST FLOOR PLAN) p.23, A-106 (DORM SECOND FLOOR PLAN) p.24, A-107 (DORM THIRD FLOOR PLAN) p.25: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet. Not tagged on any plan sheet: 01, 102." }, "set": { "sha16": "7478006f7fd5b43c", "project": "_R2502-01 Final Bid Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_R2502-01%20Final%20Bid%20Plans.pdf", "pdf_sha256": "7478006f7fd5b43ce1024c90355f9899e6c5f05b0b557cfa7e1e4ec6efe4b4fa", "rows": 156, "door_rows": 152, "not_door_rows": [{ "mark": "1", "page": 45, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }, { "mark": "2", "page": 45, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }, { "mark": "3", "page": 45, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }, { "mark": "4", "page": 45, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }], "doors_on_plan": 150, "plan_sheets": [{ "sheet": "A-105", "page": 23, "title": "DORM FIRST FLOOR PLAN" }, { "sheet": "A-106", "page": 24, "title": "DORM SECOND FLOOR PLAN" }, { "sheet": "A-107", "page": 25, "title": "DORM THIRD FLOOR PLAN" }, { "sheet": "A-112", "page": 28, "title": "ADMIN. RESTROOM PLANS AND DETAILS ALTERNATE #1" }], "input": "tools/accuracy/g020/7478006f7fd5b43c.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "192a16af8f31ae0c": { "project": "_T2507-01 Final Bid Plans", "source": "harvested-set", "doors": [{ "mark": "100A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 62.93, "z": 54.15, "room": "100", "room_name": "CAN WASH", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 51.48, "room_z": 49.48, "building": 0 }, "row": { "page": 10, "text": `100 CAN WASH A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 0 } }, { "mark": "101A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 67.7, "z": 57.59, "room": "101", "room_name": "SCULLERY", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 56.15, "room_z": 61.48, "building": 0 }, "row": { "page": 10, "text": `101 SCULLERY A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 1 } }, { "mark": "102A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 67.7, "z": 69.93, "room": "102", "room_name": "FOOD PREP", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 56.15, "room_z": 75.7, "building": 0 }, "row": { "page": 10, "text": `102 FOOD PREP A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 2 } }, { "mark": "103A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 62.48, "z": 84.26, "room": "103", "room_name": "FOOD STORAGE", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 55.48, "room_z": 89.93, "building": 0 }, "row": { "page": 10, "text": `103 FOOD STORAGE A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 3 } }, { "mark": "104A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 47.59, "z": 97.93, "room": "104", "room_name": "CORRIDOR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 59.7, "room_z": 97.93, "building": 0 }, "row": { "page": 10, "text": `104 CORRIDOR A 3'-0" 7'-0" HM EXIST HM EXIST 3`, "index": 4 } }, { "mark": "105A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 67.7, "z": 106.81, "room": "105", "room_name": "MAINT / STOR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 53.7, "room_z": 106.48, "building": 0 }, "row": { "page": 10, "text": `105 MAINT / STOR A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 5 } }, { "mark": "106A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 67.7, "z": 117.48, "room": "106", "room_name": "MOTHERS CNTR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 55.59, "room_z": 117.26, "building": 0 }, "row": { "page": 10, "text": `106 MOTHERS CNTR A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 6 } }, { "mark": "107A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 67.7, "z": 127.48, "room": "107", "room_name": "MAINT. EQUIP.", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 58.48, "room_z": 135.26, "building": 0 }, "row": { "page": 10, "text": `107 MAINT. EQUIP. A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 7 } }, { "mark": "108A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 65.26, "z": 153.37, "room": "108", "room_name": "OFFICE", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 56.26, "room_z": 152.59, "building": 0 }, "row": { "page": 10, "text": `108 OFFICE A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 8 } }, { "mark": "109A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 65.26, "z": 158.48, "room": "109", "room_name": "BDE OP SGM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 57.04, "room_z": 160.48, "building": 0 }, "row": { "page": 10, "text": `109 BDE OP SGM A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 9 } }, { "mark": "110A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 86.81, "z": 147.81, "room": "110", "room_name": "OP S-3", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 77.93, "room_z": 156.26, "building": 0 }, "row": { "page": 10, "text": `110 OP S-3 A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 10 } }, { "mark": "113A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 100.81, "z": 147.7, "room": "113", "room_name": "S1 PERSONNEL SERVICES", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 113.48, "room_z": 158.26, "building": 0 }, "row": { "page": 10, "text": `113 S1 PERSONNEL SERVICES A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 11 } }, { "mark": "113B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 115.7, "z": 145.93, "room": "113", "room_name": "S1 PERSONNEL SERVICES", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 113.48, "room_z": 158.26, "building": 0 }, "row": { "page": 10, "text": `113 S1 PERSONNEL SERVICES B 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 12 } }, { "mark": "114A", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.42, "z": 10.56, "room": "114", "room_name": "BDE S1 OFFICER", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1.11, "room_z": 10.84, "building": 0 }, "row": { "page": 10, "text": `114 BDE S1 OFFICER A 2'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 13 } }, { "mark": "115A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 1.28, "z": 9.55, "room": "115", "room_name": "BDE HR TECH", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1, "room_z": 10.03, "building": 0 }, "row": { "page": 10, "text": `115 BDE HR TECH A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 14 } }, { "mark": "115B", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.42, "z": 10.19, "room": "115", "room_name": "BDE HR TECH", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1, "room_z": 10.03, "building": 0 }, "row": { "page": 10, "text": `115 BDE HR TECH B 2'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 15 } }, { "mark": "116A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 1.78, "z": 9.55, "room": "116", "room_name": "CLASSROOM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 2.45, "room_z": 10.23, "building": 0 }, "row": { "page": 10, "text": `116 CLASSROOM A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 16 } }, { "mark": "116B", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 3.26, "z": 10.36, "room": "116", "room_name": "CLASSROOM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 2.45, "room_z": 10.23, "building": 0 }, "row": { "page": 10, "text": `116 CLASSROOM B 2'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 17 } }, { "mark": "117A", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 2.2, "z": 10.56, "room": "117", "room_name": "BDE CMD SGT MAJ", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1.87, "room_z": 11.14, "building": 0 }, "row": { "page": 10, "text": `117 BDE CMD SGT MAJ A 2'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 18 } }, { "mark": "118A", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 2.56, "z": 10.56, "room": "118", "room_name": "COMMANDER", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 2.85, "room_z": 11.17, "building": 0 }, "row": { "page": 10, "text": `118 COMMANDER A 2'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 19 } }, { "mark": "119A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 3.64, "z": 9.55, "room": "119", "room_name": "AO/XO", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 4, "room_z": 10.26, "building": 0 }, "row": { "page": 10, "text": `119 AO/XO A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 20 } }, { "mark": "120A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 3.11, "z": 8.38, "room": "120", "room_name": "SIPR ROOM", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 3.75, "room_z": 8.56, "building": 0 }, "row": { "page": 10, "text": `120 SIPR ROOM A 3'-0" 7'-0" HM D1 HM F1 2`, "index": 21 } }, { "mark": "121A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 3.11, "z": 7.99, "room": "121", "room_name": "MECH", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 3.6, "room_z": 8.04, "building": 0 }, "row": { "page": 10, "text": `121 MECH A 3'-0" 7'-0" HM D1 HM F1 2`, "index": 22 } }, { "mark": "122A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 4.31, "z": 7.82, "room": "122", "room_name": "STO.", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 4.11, "room_z": 8.01, "building": 0 }, "row": { "page": 10, "text": `122 STO. A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 23 } }, { "mark": "123A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 2.82, "z": 7.82, "room": null, "room_name": "123", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 10, "text": `123 S-4 A 3'-0" 7'-0" HM D1 HM F1 2`, "index": 24 } }, { "mark": "124A", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 3.45, "z": 5.67, "room": "124", "room_name": "OFFICE", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 3.23, "room_z": 5.38, "building": 0 }, "row": { "page": 10, "text": `124 OFFICE A 2'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 25 } }, { "mark": "125A", "location": null, "type": null, "material": null, "width_in": 32, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 3.81, "z": 5.73, "room": "125", "room_name": "OFFICE", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 4.05, "room_z": 5.19, "building": 0 }, "row": { "page": 10, "text": `125 OFFICE A 2'-8" 7'-0" HM D1 HM F1 2`, "index": 26 } }, { "mark": "126A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.74, "z": 8.93, "room": "126", "room_name": "WOMENS", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 1.24, "room_z": 8.78, "building": 0 }, "row": { "page": 10, "text": `126 WOMENS A 3'-0" 7'-0" HM D1 HM F1 2`, "index": 27 } }, { "mark": "127A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.58, "z": 7.27, "room": "127", "room_name": "MENS", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 1.61, "room_z": 7.68, "building": 0 }, "row": { "page": 10, "text": `127 MENS A 3'-0" 7'-0" HM D1 HM F1 2`, "index": 28 } }, { "mark": "128A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.72, "z": 7.02, "room": "128", "room_name": "MECH", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 0.73, "room_z": 6.74, "building": 0 }, "row": { "page": 10, "text": `128 MECH A 3'-0" 7'-0" HM D1 HM F1 2`, "index": 29 } }, { "mark": "128B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.72, "z": 5.98, "room": "128", "room_name": "MECH", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 0.73, "room_z": 6.74, "building": 0 }, "row": { "page": 10, "text": `128 MECH B 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 30 } }, { "mark": "129A", "location": null, "type": null, "material": null, "width_in": 44, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.74, "z": 4.23, "room": "129", "room_name": "UNIT ADMIN", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1.13, "room_z": 5.38, "building": 0 }, "row": { "page": 10, "text": `129 UNIT ADMIN A 3'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 31 } }, { "mark": "129B", "location": null, "type": null, "material": null, "width_in": 44, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 2.66, "z": 6.18, "room": "129", "room_name": "UNIT ADMIN", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1.13, "room_z": 5.38, "building": 0 }, "row": { "page": 10, "text": `129 UNIT ADMIN B 3'-8" 7'-0" HM EXIST HM EXIST 1`, "index": 32 } }, { "mark": "130A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.72, "z": 5.54, "room": "130", "room_name": "STO", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 0.72, "room_z": 5.78, "building": 0 }, "row": { "page": 10, "text": `130 STO A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 33 } }, { "mark": "131A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 1.01, "z": 3.87, "room": "131", "room_name": "EXCERCISE ROOM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 3.34, "room_z": 3.38, "building": 0 }, "row": { "page": 10, "text": `131 EXCERCISE ROOM A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 34 } }, { "mark": "131B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 4.2, "z": 1.54, "room": "131", "room_name": "EXCERCISE ROOM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 3.34, "room_z": 3.38, "building": 0 }, "row": { "page": 10, "text": `131 EXCERCISE ROOM B 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 35 } }, { "mark": "132A", "location": null, "type": null, "material": null, "width_in": 66, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.58, "z": 2.29, "room": "132", "room_name": "DRILL FLOOR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 114.48, "room_z": 73.26, "building": 0, "shared_mark": { "rows": 2, "tags": 2, "order": "assumed" }, "note": "shared mark, order assumed" }, "row": { "page": 10, "text": `132 DRILL FLOOR A 5'-6" 7'-0" HM EXIST HM EXIST 1`, "index": 36 } }, { "mark": "132A", "location": null, "type": null, "material": null, "width_in": 75, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.25, "z": 6.1, "room": "132", "room_name": "DRILL FLOOR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 114.48, "room_z": 73.26, "building": 0, "shared_mark": { "rows": 2, "tags": 2, "order": "assumed" }, "note": "shared mark, order assumed" }, "row": { "page": 10, "text": `132 DRILL FLOOR A 6'-3" 7'-0" HM EXIST HM EXIST 1`, "index": 37 } }, { "mark": "132B", "location": null, "type": null, "material": null, "width_in": 66, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 70.81, "z": 104.59, "room": "132", "room_name": "DRILL FLOOR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 114.48, "room_z": 73.26, "building": 0 }, "row": { "page": 10, "text": `132 DRILL FLOOR B 5'-6" 7'-0" HM EXIST HM EXIST 1`, "index": 38 } }, { "mark": "133A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0.73, "z": 2.54, "room": "133", "room_name": "SUPPLY OFFICE", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 1.03, "room_z": 3.06, "building": 0 }, "row": { "page": 10, "text": `133 SUPPLY OFFICE A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 39 } }, { "mark": "136A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 85.37, "z": 138.48, "room": "136", "room_name": "RECRUITER", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 81.37, "room_z": 129.7, "building": 0 }, "row": { "page": 10, "text": `136 RECRUITER A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 40 } }, { "mark": "137A", "location": null, "type": null, "material": null, "width_in": 60, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 93.04, "z": 131.48, "room": "137", "room_name": "STORAGE", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 94.81, "room_z": 127.93, "building": 0 }, "row": { "page": 10, "text": `137 STORAGE A 5'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 41 } }, { "mark": "138A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 102.15, "z": 138.93, "room": "138", "room_name": "MECH/MAIL ROOM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 101.93, "room_z": 133.04, "building": 0 }, "row": { "page": 10, "text": `138 MECH/MAIL ROOM A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 42 } }, { "mark": "139A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0, "z": 8.5, "room": "139", "room_name": "CHAPLAINS OFFICE", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 113.93, "room_z": 133.59, "building": 0 }, "row": { "page": 10, "text": `139 CHAPLAINS OFFICE A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 43 } }, { "mark": "140A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 0, "z": 6.91, "room": "140", "room_name": "TACTICAL OP. CNTR", "room_by": "schedule_location", "unsure": false, "also_on": ["A-104"], "room_x": 115.48, "room_z": 123.48, "building": 0 }, "row": { "page": 10, "text": `140 TACTICAL OP. CNTR A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 44 } }, { "mark": "141A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 74.26, "z": 114.59, "room": "141", "room_name": "HHD CMND TEAM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 92.7, "room_z": 119.37, "building": 0 }, "row": { "page": 10, "text": `141 HHD CMND TEAM A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 45 } }, { "mark": "141B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 97.7, "z": 114.59, "room": "141", "room_name": "HHD CMND TEAM", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 92.7, "room_z": 119.37, "building": 0 }, "row": { "page": 10, "text": `141 HHD CMND TEAM B 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 46 } }, { "mark": "142A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 97.7, "z": 110.15, "room": "142", "room_name": "LEGAL", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 91.15, "room_z": 106.93, "building": 0 }, "row": { "page": 10, "text": `142 LEGAL A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 47 } }, { "mark": "143A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "plan": { "sheet": "A-100", "page": 7, "x": 84.48, "z": 112.59, "room": "143", "room_name": "TROOP CMDR", "room_by": "schedule_location", "unsure": false, "also_on": [], "room_x": 80.26, "room_z": 105.93, "building": 0 }, "row": { "page": 10, "text": `143 TROOP CMDR A 3'-0" 7'-0" HM EXIST HM EXIST 1`, "index": 48 } }], "sets": {}, "notes": ["Real harvested bid set _T2507-01 Final Bid Plans: the door rows are the rows SubX's reader reads from the set's own schedule pages; sizes come from each row's printed text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A-100", "page": 7, "title": "FIRST FLOOR PLANS", "scale": `SCALE: 1 1/2"= 1'-0", SCALE: 1/8" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 116, "depth_ft": 160, "rooms": [{ "number": "135", "name": "UNIT STORAGE", "corridor": false, "x": 2.53, "z": 0 }, { "number": "100", "name": "CAN WASH", "corridor": false, "x": 51.48, "z": 49.48 }, { "number": "101", "name": "SCULLERY", "corridor": false, "x": 56.15, "z": 61.48 }, { "number": "133", "name": "SUPPLY OFFICE", "corridor": false, "x": 1.03, "z": 3.06 }, { "number": "134", "name": "ARMS VAULT", "corridor": false, "x": 2.02, "z": 3.27 }, { "number": "131", "name": "EXCERCISE ROOM", "corridor": false, "x": 3.34, "z": 3.38 }, { "number": "132", "name": "DRILL FLOOR", "corridor": false, "x": 114.48, "z": 73.26 }, { "number": "102", "name": "FOOD PREP", "corridor": false, "x": 56.15, "z": 75.7 }, { "number": "103", "name": "FOOD STORAGE", "corridor": false, "x": 55.48, "z": 89.93 }, { "number": "125", "name": "OFFICE", "corridor": false, "x": 4.05, "z": 5.19 }, { "number": "129", "name": "UNIT ADMIN", "corridor": false, "x": 1.13, "z": 5.38 }, { "number": "124", "name": "OFFICE", "corridor": false, "x": 3.23, "z": 5.38 }, { "number": "104", "name": "CORRIDOR", "corridor": true, "x": 59.7, "z": 97.93 }, { "number": "TA17", "name": "TA10", "corridor": false, "x": 83.7, "z": 100.04 }, { "number": "130", "name": "STO", "corridor": false, "x": 0.72, "z": 5.78 }, { "number": "TA19", "name": "TA17", "corridor": false, "x": 83.7, "z": 101.59 }, { "number": "105", "name": "MAINT / STOR", "corridor": false, "x": 53.7, "z": 106.48 }, { "number": "143", "name": "TROOP CMDR", "corridor": false, "x": 80.26, "z": 105.93 }, { "number": "142", "name": "LEGAL", "corridor": false, "x": 91.15, "z": 106.93 }, { "number": "TA2", "name": "TA1", "corridor": false, "x": 7.1, "z": 6.51 }, { "number": "TA3", "name": "TA2", "corridor": false, "x": 7.1, "z": 6.65 }, { "number": "128", "name": "MECH", "corridor": false, "x": 0.73, "z": 6.74 }, { "number": "106", "name": "MOTHERS CNTR", "corridor": false, "x": 55.59, "z": 117.26 }, { "number": "141", "name": "HHD CMND TEAM", "corridor": false, "x": 92.7, "z": 119.37 }, { "number": "TA4", "name": "TA3", "corridor": false, "x": 7.1, "z": 6.78 }, { "number": "TA5", "name": "TA4", "corridor": false, "x": 7.1, "z": 6.9 }, { "number": "TA6", "name": "TA5", "corridor": false, "x": 7.1, "z": 7.03 }, { "number": "TA7", "name": "TA6", "corridor": false, "x": 7.1, "z": 7.14 }, { "number": "TA8", "name": "TA7", "corridor": false, "x": 7.1, "z": 7.26 }, { "number": "TA9", "name": "TA8", "corridor": false, "x": 7.1, "z": 7.38 }, { "number": "TA10", "name": "TA9", "corridor": false, "x": 7.12, "z": 7.52 }, { "number": "140", "name": "TACTICAL OP. CNTR", "corridor": false, "x": 115.48, "z": 123.48 }, { "number": "127", "name": "MENS", "corridor": false, "x": 1.61, "z": 7.68 }, { "number": "137", "name": "STORAGE", "corridor": false, "x": 94.81, "z": 127.93 }, { "number": "121", "name": "MECH", "corridor": false, "x": 3.6, "z": 8.04 }, { "number": "122", "name": "STO.", "corridor": false, "x": 4.11, "z": 8.01 }, { "number": "TA12", "name": "TA11", "corridor": false, "x": 7.12, "z": 7.86 }, { "number": "TA13", "name": "TA12", "corridor": false, "x": 7.12, "z": 7.98 }, { "number": "TA14", "name": "TA13", "corridor": false, "x": 7.12, "z": 8.1 }, { "number": "136", "name": "RECRUITER", "corridor": false, "x": 81.37, "z": 129.7 }, { "number": "TA15", "name": "TA14", "corridor": false, "x": 7.12, "z": 8.22 }, { "number": "TA16", "name": "TA15", "corridor": false, "x": 7.12, "z": 8.35 }, { "number": "138", "name": "MECH/MAIL ROOM", "corridor": false, "x": 101.93, "z": 133.04 }, { "number": "139", "name": "CHAPLAINS OFFICE", "corridor": false, "x": 113.93, "z": 133.59 }, { "number": "TA17", "name": "TA16", "corridor": false, "x": 7.12, "z": 8.47 }, { "number": "120", "name": "SIPR ROOM", "corridor": false, "x": 3.75, "z": 8.56 }, { "number": "TA18", "name": "TA17", "corridor": false, "x": 7.12, "z": 8.6 }, { "number": "107", "name": "MAINT. EQUIP.", "corridor": false, "x": 58.48, "z": 135.26 }, { "number": "126", "name": "WOMENS", "corridor": false, "x": 1.24, "z": 8.78 }, { "number": "TA19", "name": "TA18", "corridor": false, "x": 7.12, "z": 8.73 }, { "number": "TA20", "name": "TA19", "corridor": false, "x": 7.12, "z": 8.86 }, { "number": "112", "name": "LOBBY", "corridor": true, "x": 95.04, "z": 141.48 }, { "number": "115", "name": "BDE HR TECH", "corridor": false, "x": 1, "z": 10.03 }, { "number": "108", "name": "OFFICE", "corridor": false, "x": 56.26, "z": 152.59 }, { "number": "116", "name": "CLASSROOM", "corridor": false, "x": 2.45, "z": 10.23 }, { "number": "119", "name": "AO/XO", "corridor": false, "x": 4, "z": 10.26 }, { "number": "110", "name": "OP S-3", "corridor": false, "x": 77.93, "z": 156.26 }, { "number": "113", "name": "S1 PERSONNEL SERVICES", "corridor": false, "x": 113.48, "z": 158.26 }, { "number": "111", "name": "VEST.", "corridor": true, "x": 94.48, "z": 160.04 }, { "number": "109", "name": "BDE OP SGM", "corridor": false, "x": 57.04, "z": 160.48 }, { "number": "114", "name": "BDE S1 OFFICER", "corridor": false, "x": 1.11, "z": 10.84 }, { "number": "117", "name": "BDE CMD SGT MAJ", "corridor": false, "x": 1.87, "z": 11.14 }, { "number": "118", "name": "COMMANDER", "corridor": false, "x": 2.85, "z": 11.17 }] }], "counts": { "doors": 49, "on_plan": 49, "rooms": 63, "corridors": 3, "unmatched_tags": 0 }, "unmatched_tags": [], "not_on_plan": [], "note": "Laid out from the floor plan A-100 (FIRST FLOOR PLANS) p.7: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet." }, "set": { "sha16": "192a16af8f31ae0c", "project": "_T2507-01 Final Bid Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_T2507-01%20Final%20Bid%20Plans.pdf", "pdf_sha256": "192a16af8f31ae0c4a41976578627641eddcb36eeb645d0e4d99f92f97690ceb", "rows": 49, "door_rows": 49, "not_door_rows": [], "doors_on_plan": 49, "plan_sheets": [{ "sheet": "A-100", "page": 7, "title": "FIRST FLOOR PLANS" }, { "sheet": "A-101", "page": 8, "title": "FIRST FLOOR DIMENSION PLAN" }, { "sheet": "A-104", "page": 11, "title": "PLANS & DETAILS" }], "input": "tools/accuracy/g045/192a16af8f31ae0c.production.json (reader A's rows and readPlan, as SubX reads the set)", "shared_marks": [{ "mark": "132A", "sheet": "A-100", "page": 7, "rows": 2, "tags": 2, "placed": true, "note": "shared mark, order assumed" }] } },
  "e3d0cc1bc22fd824": { "project": "_T2504-03 - Final Plans", "source": "harvested-set", "doors": [{ "mark": "100", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 205.93, "z": 145.78, "room": "124", "room_name": "CLASSROOM", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 191.11, "room_z": 130.81, "building": 0 }, "row": { "page": 18, "text": `100 AL-1 PR 3' - 0" 7' - 0" F3 H4 J4 09 LEVER/PADDLE HARDWARE; KEYPAD CONTROLS ENTRY SIDE ONLY. SEE SPECIFICATIONS. EXP. DATE: 12/31/2027`, "index": 0 } }, { "mark": "101", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 172.15, "z": 151.85, "room": "102", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 170.67, "room_z": 163.85, "building": 0 }, "row": { "page": 18, "text": `101 WD-1 3' - 0" 7' - 0" F1 H1 J1 90 MIN. 04 11`, "index": 1 } }, { "mark": "102", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 160.15, "z": 142.96, "room": "103", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": ["A-401"], "room_x": 160, "room_z": 146.37, "building": 0 }, "row": { "page": 18, "text": `102 HM-1 3' - 0" 7' - 0" F2 H2 J2 05 7,10,12 3. PROVIDE SURFACE-MOUNTED OR FLUSH-MOUNT DIGITAL KEYPAD (STANDALONE CONTROLLER`, "index": 2 } }, { "mark": "103", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 144.15, "z": 142.96, "room": "112", "room_name": "JAN CL", "room_by": "nearest_label", "unsure": true, "also_on": ["A-401"], "room_x": 148.89, "room_z": 146.37, "building": 0 }, "row": { "page": 18, "text": `103 HM-1 3' - 0" 7' - 0" F2 H2 J2 05 7,10`, "index": 3 } }, { "mark": "104", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 159.26, "z": 93.63, "room": "01", "room_name": "76 LOCKERS", "room_by": "nearest_label", "unsure": true, "also_on": ["A-401"], "room_x": 152.89, "room_z": 87.26, "building": 0 }, "row": { "page": 18, "text": `104 HM-1 3' - 0" 7' - 0" F2 H2 J2 06 7,10,12`, "index": 4 } }, { "mark": "105", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 153.63, "z": 93.63, "room": "01", "room_name": "76 LOCKERS", "room_by": "nearest_label", "unsure": true, "also_on": ["A-401"], "room_x": 152.89, "room_z": 87.26, "building": 0 }, "row": { "page": 18, "text": `105 HM-1 3' - 0" 7' - 0" F2 H2 J2 06 7,10 4. PROVIDE LOW-VOLTAGE POWER TRANSFER (ELECTRIC HINGE, DOOR LOOP, OR WIRELESS`, "index": 5 } }, { "mark": "106", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 35.87, "z": 15.35, "room": "120", "room_name": "STORAGE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 33.04, "room_z": 9.96, "building": 0 }, "row": { "page": 18, "text": `106 HM-1 3' - 0" 7' - 0" F2 H2 J2 07 POWER TRANSFER DEVICE) TO ROUTE WIRING ACROSS DOOR LEAF TO FRAME (EXISTING DOORS`, "index": 6 } }, { "mark": "107", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 167.85, "z": 89.63, "room": "113", "room_name": "LOCKER ROOM", "room_by": "nearest_label", "unsure": true, "also_on": ["A-401"], "room_x": 158.22, "room_z": 81.04, "building": 0 }, "row": { "page": 18, "text": `107 WD-1 3' - 0" 7' - 0" F2 H2 J2 05 7,11,12 WHERE NO FACTORY-WIRED HINGE EXISTS).`, "index": 7 } }, { "mark": "108", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 136.59, "z": 146.52, "room": "25", "room_name": "ALTERNATE #1", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 50.74, "room_z": 3.78, "building": 0 }, "row": { "page": 18, "text": `108 WD-1 3' - 0" 7' - 0" F1 H1 J1 90 MIN. 04 11`, "index": 8 } }, { "mark": "109", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 31.41, "z": 27.85, "room": "129", "room_name": "MECHANICAL ROOM", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 0, "room_z": 10.74, "building": 0 }, "row": { "page": 18, "text": `109 HM-1 PR 3' - 0" 7' - 0" F2 H2 J2 10 5. PROVIDE CLASS 2 LOW-VOLTAGE POWER SUPPLY/TRANSFORMER (12/24VDC, RATED FOR`, "index": 9 } }, { "mark": "110", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 104.15, "z": 147.85, "room": "104", "room_name": "VESTIBULE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 97.63, "room_z": 141.48, "building": 0 }, "row": { "page": 18, "text": `110 EXISTING AL PR 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 03A TO DEDICATED 120V CIRCUIT BY ELECTRICAL CONTRACTOR.`, "index": 10 } }, { "mark": "111", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 116.74, "z": 147.85, "room": "25", "room_name": "ALTERNATE #1", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 50.74, "room_z": 3.78, "building": 0 }, "row": { "page": 18, "text": `111 EXISTING AL PR 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 03 1,2,3,4,5,6,7,8`, "index": 11 } }, { "mark": "112", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 170.96, "z": 197.93, "room": "127", "room_name": "CLASSROOM", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 191.11, "room_z": 187.7, "building": 0 }, "row": { "page": 18, "text": `112 EXISTING AL PR 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 03B 6. PROVIDE LOW-VOLTAGE WIRING (18-22 AWG PER LOCK MANUFACTURER) FROM POWER SUPPLY`, "index": 12 } }, { "mark": "113", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 64.96, "z": 0, "room": "100", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 64.96, "room_z": 7.26, "building": 0 }, "row": { "page": 18, "text": `113 EXISTING AL PR 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 03B TO KEYPAD AND ELECTRIFIED LOCK, ROUTED IN CONDUIT/RACEWAY. Professional of Record:`, "index": 13 } }, { "mark": "114", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 109.78, "z": 98.52, "room": "109", "room_name": "STORAGE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 118.07, "room_z": 101.33, "building": 0 }, "row": { "page": 18, "text": `114 EXISTING HM 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 02 MICHAEL S. SUNDERMEYER`, "index": 14 } }, { "mark": "115", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 53.63, "z": 92.59, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 18, "text": `115 EXISTING HM PR 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 11`, "index": 15 } }, { "mark": "116", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 24.44, "z": 174.37, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 18, "text": `116 EXISTING AL PR 3' - 0" 7' - 0" EXISTING EXISTING EXISTING 01 PRIOR TO ROUGH-IN.`, "index": 16 } }, { "mark": "120", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 18, "plan": { "sheet": "A-102", "page": 9, "x": 155.11, "z": 139.85, "room": "103", "room_name": "CORRIDOR", "room_by": "nearest_label", "unsure": true, "also_on": ["A-401"], "room_x": 160, "room_z": 146.37, "building": 0 }, "row": { "page": 18, "text": `120 HM-1 3' - 0" 7' - 0" F2 H2 J2 08 12`, "index": 18 } }], "sets": {}, "notes": ["Real harvested bid set _T2504-03 - Final Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A-102", "page": 9, "title": "NEW CONSTRUCTION PLAN LEGEND", "scale": `SCALE: 3/16" = 1'-0", SCALE: 3/32" = 1'-0", SCALE: 1/4" = 1'-0", NORTH A-102 SCALE: 3/32" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 322, "depth_ft": 200, "rooms": [{ "number": "25", "name": "ALTERNATE #1", "corridor": false, "x": 50.74, "z": 3.78 }, { "number": "118", "name": "STORAGE", "corridor": false, "x": 55.41, "z": 7.7 }, { "number": "100", "name": "CORRIDOR", "corridor": true, "x": 64.96, "z": 7.26 }, { "number": "119", "name": "CLASSROOM", "corridor": false, "x": 74.96, "z": 7.7 }, { "number": "129", "name": "MECHANICAL ROOM", "corridor": false, "x": 0, "z": 10.74 }, { "number": "25", "name": "ALTERNATE #1", "corridor": false, "x": 27.37, "z": 8.52 }, { "number": "120", "name": "STORAGE", "corridor": false, "x": 33.04, "z": 9.96 }, { "number": "121", "name": "CLASSROOM", "corridor": false, "x": 45.93, "z": 10.19 }, { "number": "128", "name": "DATA CLOSET", "corridor": false, "x": 29.87, "z": 12.69 }, { "number": "113", "name": "LOCKER ROOM", "corridor": false, "x": 158.22, "z": 81.04 }, { "number": "122", "name": "CLASSROOM", "corridor": false, "x": 191.26, "z": 81.04 }, { "number": "01", "name": "76 LOCKERS", "corridor": false, "x": 152.89, "z": 87.26 }, { "number": "110", "name": "TOILET", "corridor": false, "x": 96.15, "z": 90.52 }, { "number": "108", "name": "STORAGE", "corridor": false, "x": 99.41, "z": 103.41 }, { "number": "109", "name": "STORAGE", "corridor": false, "x": 118.07, "z": 101.33 }, { "number": "123", "name": "CLASSROOM", "corridor": false, "x": 191.26, "z": 104.74 }, { "number": "107", "name": "OFFICE", "corridor": false, "x": 125.78, "z": 106.07 }, { "number": "114", "name": "MEN'S SHOWER", "corridor": false, "x": 144.59, "z": 111.7 }, { "number": "115", "name": "WOMEN'S SHOWER", "corridor": false, "x": 163.26, "z": 111.7 }, { "number": "105", "name": "KITCHEN", "corridor": false, "x": 99.11, "z": 112.89 }, { "number": "11", "name": "DN", "corridor": false, "x": 117.19, "z": 125.19 }, { "number": "111", "name": "STAIR", "corridor": false, "x": 117.19, "z": 129.78 }, { "number": "106", "name": "OFFICE", "corridor": false, "x": 127.41, "z": 127.56 }, { "number": "116", "name": "MENS RESTROOM", "corridor": false, "x": 143.26, "z": 129.78 }, { "number": "117", "name": "WOMENS RESTROOM", "corridor": false, "x": 161.48, "z": 130.67 }, { "number": "124", "name": "CLASSROOM", "corridor": false, "x": 191.11, "z": 130.81 }, { "number": "104", "name": "VESTIBULE", "corridor": true, "x": 97.63, "z": 141.48 }, { "number": "112", "name": "JAN CL", "corridor": false, "x": 148.89, "z": 146.37 }, { "number": "103", "name": "CORRIDOR", "corridor": true, "x": 160, "z": 146.37 }, { "number": "101", "name": "CORRIDOR", "corridor": true, "x": 184.44, "z": 147.26 }, { "number": "25", "name": "ALTERNATE #1", "corridor": false, "x": 127.85, "z": 154.07 }, { "number": "6303", "name": "PROJECT # T2504-03", "corridor": false, "x": 321.78, "z": 158.07 }, { "number": "126", "name": "CLASSROOM", "corridor": false, "x": 191.56, "z": 162.07 }, { "number": "102", "name": "CORRIDOR", "corridor": true, "x": 170.67, "z": 163.85 }, { "number": "125", "name": "CLASSROOM", "corridor": false, "x": 152.3, "z": 169.19 }, { "number": "25", "name": "ALTERNATE #1", "corridor": false, "x": 128.44, "z": 178.96 }, { "number": "127", "name": "CLASSROOM", "corridor": false, "x": 191.11, "z": 187.7 }] }], "counts": { "doors": 18, "on_plan": 18, "rooms": 37, "corridors": 5, "unmatched_tags": 21 }, "unmatched_tags": [{ "tag": "3", "sheet": "A-102", "page": 9 }, { "tag": "2", "sheet": "A-102", "page": 9 }, { "tag": "4", "sheet": "A-102", "page": 9 }, { "tag": "5", "sheet": "A-102", "page": 9 }, { "tag": "6", "sheet": "A-102", "page": 9 }, { "tag": "7", "sheet": "A-102", "page": 9 }, { "tag": "8", "sheet": "A-102", "page": 9 }, { "tag": "9", "sheet": "A-102", "page": 9 }, { "tag": "3", "sheet": "A-102", "page": 9 }, { "tag": "3", "sheet": "A-102", "page": 9 }, { "tag": "4", "sheet": "A-102", "page": 9 }, { "tag": "4", "sheet": "A-401", "page": 13 }, { "tag": "5", "sheet": "A-401", "page": 13 }, { "tag": "6", "sheet": "A-401", "page": 13 }, { "tag": "7", "sheet": "A-401", "page": 13 }, { "tag": "4", "sheet": "A-401", "page": 13 }, { "tag": "5", "sheet": "A-401", "page": 13 }, { "tag": "6", "sheet": "A-401", "page": 13 }, { "tag": "7", "sheet": "A-401", "page": 13 }, { "tag": "118", "sheet": "A-401", "page": 13 }, { "tag": "119", "sheet": "A-401", "page": 13 }], "not_on_plan": [], "note": "Laid out from the floor plan A-102 (NEW CONSTRUCTION PLAN LEGEND) p.9: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet." }, "set": { "sha16": "e3d0cc1bc22fd824", "project": "_T2504-03 - Final Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_T2504-03%20-%20Final%20Plans.pdf", "pdf_sha256": "e3d0cc1bc22fd82445079c068872f2877a6c2c9bd37cca59b0b727b1adb8816f", "rows": 19, "door_rows": 18, "not_door_rows": [{ "mark": "1", "page": 18, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }], "doors_on_plan": 18, "plan_sheets": [{ "sheet": "A-102", "page": 9, "title": "NEW CONSTRUCTION PLAN LEGEND" }, { "sheet": "A-401", "page": 13, "title": "NEW CONSTRUCTION PLAN LEGEND" }], "input": "tools/accuracy/g020/e3d0cc1bc22fd824.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "f97e99f88a931e74": { "project": "_R2502-01 REBID Final Bid Plans", "source": "harvested-set", "doors": [{ "mark": "01", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 88, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 32, "row": { "page": 32, "text": `01 A-122 PT101 EXISTING HM-1(PR) 8' - 0" 7' - 4" 1 3/4" TYP-1 3/A-602 6/A-602 8/A-602 09.08`, "index": 0 } }, { "mark": "101A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `101A DORM 101 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 1 } }, { "mark": "101B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `101B RESTROOM 101B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 3 } }, { "mark": "201B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `201B RESTROOM 201B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 EXP. DATE: 12/31/27`, "index": 4 } }, { "mark": "102", "location": null, "type": null, "material": null, "width_in": 30, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `102 LAUNDRY ROOM 102 WD-1 2' - 6" 6' - 8" 1 3/4" EXIST N/A N/A N/A 05.01 1&2`, "index": 5 } }, { "mark": "202A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `202A DORM 202 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 6 } }, { "mark": "103A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `103A DORM 103 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 7 } }, { "mark": "103B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `103B RESTROOM 101B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 8 } }, { "mark": "203A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `203A DORM 203 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 9 } }, { "mark": "104A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `104A SINGLE BEDROOM 104A WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 10 } }, { "mark": "203B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `203B RESTROOM 203B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 11 } }, { "mark": "104B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `104B PRIVATE BATH 104B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 12 } }, { "mark": "104C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `104C SINGLE BEDROOM 104 WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 3`, "index": 14 } }, { "mark": "104D", "location": null, "type": null, "material": null, "width_in": 40, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `104D CLOSET 104 WD-2 (PR) 3' - 4" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 04.02 3`, "index": 16 } }, { "mark": "104E", "location": null, "type": null, "material": null, "width_in": 40, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `104E CLOSET 104 WD-2 (PR) 3' - 4" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 04.02 3`, "index": 17 } }, { "mark": "105A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `105A DORM 105 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 18 } }, { "mark": "105B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `105B RESTROOM 105B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 19 } }, { "mark": "206B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `206B RESTROOM 206B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 20 } }, { "mark": "107A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `107A DORM 107 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 21 } }, { "mark": "107B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `107B RESTROOM 105B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 22 } }, { "mark": "207B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `207B RESTROOM 207B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 23 } }, { "mark": "109A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `109A DORM 109 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 24 } }, { "mark": "109B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `109B RESTROOM 109B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 25 } }, { "mark": "208B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `208B RESTROOM 206B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 MICHAEL S. SUNDERMEYER`, "index": 26 } }, { "mark": "110", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `110 STORAGE 110 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.05 1`, "index": 27 } }, { "mark": "111A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `111A DORM 111 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 07.04 1`, "index": 28 } }, { "mark": "111B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `111B RESTROOM 109B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 29 } }, { "mark": "210A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `210A DORM 210 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 30 } }, { "mark": "112A", "location": null, "type": null, "material": null, "width_in": 72, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `112A VESTIBULE 112 AL-1 (PR) 6' - 0" 7' - 0" 1 3/4" GLZ-A 10/A602 12/A602 9/A602 01.02 4`, "index": 31 } }, { "mark": "112B", "location": null, "type": null, "material": null, "width_in": 72, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `112B VESTIBULE 112 AL-1 (PR) 6' - 0" 7' - 0" 1 3/4" GLZ-B 12/A602 SIM 14/A602 04.01`, "index": 33 } }, { "mark": "211A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `211A DORM 211 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 34 } }, { "mark": "113", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `113 KITCHENETE 113 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 08.02 1`, "index": 35 } }, { "mark": "114", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `114 STORAGE 114 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.02 1`, "index": 36 } }, { "mark": "115", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `115 UNISEX RESTROOM 115 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.02 1&2`, "index": 37 } }, { "mark": "212B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `212B RESTROOM 210B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 38 } }, { "mark": "116", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `116 JANITOR CLOSET 116 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.01 1&2`, "index": 39 } }, { "mark": "213A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `213A DORM 213 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 40 } }, { "mark": "117", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `117 OFFICE 117 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 41 } }, { "mark": "213B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `213B RESTROOM 211B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 42 } }, { "mark": "118", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `118 OFFICE 118 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 43 } }, { "mark": "214A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `214A DORM 214 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 44 } }, { "mark": "119", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `119 CONFERENCE ROOM 119 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 08.01`, "index": 45 } }, { "mark": "214B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `214B RESTROOM 214B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 46 } }, { "mark": "120A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `120A OFFICE 120 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 47 } }, { "mark": "215A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `215A PRIVATE DORM 215 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.02`, "index": 48 } }, { "mark": "120B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `120B RESTROOM 120B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 49 } }, { "mark": "121", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `121 CONFERENCE ROOM 121 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 08.01`, "index": 50 } }, { "mark": "216A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `216A DORM 216 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 51 } }, { "mark": "122A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `122A OFFICE 122 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 52 } }, { "mark": "216B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `216B RESTROOM 214B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 53 } }, { "mark": "122B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `122B RESTROOM 120B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 54 } }, { "mark": "123A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `123A OFFICE 123 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.01`, "index": 55 } }, { "mark": "217B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `217B RESTROOM 217B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 56 } }, { "mark": "123B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `123B RESTROOM 123B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 57 } }, { "mark": "124", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `124 STORAGE 124 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.06 1`, "index": 58 } }, { "mark": "125A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `125A OFFICE 125 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 59 } }, { "mark": "219A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `219A DORM 219 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 60 } }, { "mark": "125B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `125B RESTROOM 125B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 61 } }, { "mark": "126A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `126A OFFICE 126 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 62 } }, { "mark": "220A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `220A DORM 220 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 63 } }, { "mark": "126B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `126B RESTROOM 126B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 64 } }, { "mark": "127", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `127 CLASSROOM 127 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 08.03`, "index": 65 } }, { "mark": "221A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `221A DORM 221 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 66 } }, { "mark": "128A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `128A OFFICE 128 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 07.04`, "index": 67 } }, { "mark": "221B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `221B RESTROOM 221\`B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 68 } }, { "mark": "128B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `128B RESTROOM 126B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 69 } }, { "mark": "129A", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `129A MECHANICAL ROOM 129 HM-1 (PR) 8' - 0" 7' - 0" 1 3/4" TYP-1 SIM. 3/A602 7/A602 8/A602 05.04`, "index": 70 } }, { "mark": "222B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `222B RESTROOM 222B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 71 } }, { "mark": "130A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `130A CORRIDOR 130 HM-2 3' - 0" 7' - 0" 1 3/4" TYP-1 3/A602 6/A602 8/A602 3/4 HR 01.01 4`, "index": 72 } }, { "mark": "130C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `130C CORRIDOR 130 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02A`, "index": 73 } }, { "mark": "226A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `226A ACCESSIBLE DORM 226 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.02 1 DESIGN AND CONSTRUCTION`, "index": 74 } }, { "mark": "226B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `226B ACCESSIBLE RESTROOM 226B WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 75 } }, { "mark": "133C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `133C CORRIDOR 133 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02A`, "index": 76 } }, { "mark": "227B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `227B RESTROOM 225B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 77 } }, { "mark": "228A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `228A DORM 228 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 78 } }, { "mark": "228B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `228B RESTROOM 228B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 79 } }, { "mark": "229A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `229A DORM 229 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 80 } }, { "mark": "229B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `229B RESTROOM 229B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 DEPARTMENT OF MISSOURI`, "index": 81 } }, { "mark": "230A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `230A DORM 230 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 82 } }, { "mark": "230B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `230B RESTROOM 228B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 83 } }, { "mark": "231A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `231A DORM 231 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 84 } }, { "mark": "231B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `231B RESTROOM 229B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 85 } }, { "mark": "232A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `232A LIVING ROOM 232 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.03 REBID RENOVATIONS TO`, "index": 86 } }, { "mark": "232B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `232B RESTROOM 232B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2 INTERIOR/EXTERIOR & INSTALL`, "index": 87 } }, { "mark": "232C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `232C BEDROOM 232 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 EMERGENCY GENERATOR,`, "index": 88 } }, { "mark": "234", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `234 UNISEX RESTROOM 234 WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3 MSHP GENERAL`, "index": 89 } }, { "mark": "235B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `235B CORRIDOR 240 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02`, "index": 90 } }, { "mark": "236", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `236 JANITOR CLOSET 236 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.03 1&2 1510 E. ELM STREET`, "index": 91 } }, { "mark": "237", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `237 CLEAN LINEN 237 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.04 1&2 JEFFERSON CITY, MO 65101`, "index": 92 } }, { "mark": "238", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `238 STORAGE 238 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.02 1`, "index": 93 } }, { "mark": "239A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `239A CORRIDOR 239 AL-1 3' - 0" 7' - 0" 1 3/4" GLZ-C 10/A602 11/A602 9/A602 3/4 HR 01.01 4`, "index": 94 } }, { "mark": "239B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 44, "row": { "page": 44, "text": `239B CORRIDOR 239 AL-1 3' - 0" 7' - 0" 1 3/4" GLZ-D 10/A602 SIM. 13/A602 9/A602 3/4 HR 01.01 4`, "index": 95 } }, { "mark": "301A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `301A DORM 301 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 96 } }, { "mark": "301B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `301B RESTROOM 301B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 97 } }, { "mark": "302A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `302A DORM 302 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 98 } }, { "mark": "302B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `302B RESTROOM 302B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 99 } }, { "mark": "303A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `303A DORM 303 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 100 } }, { "mark": "303B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `303B RESTROOM 303B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 101 } }, { "mark": "304A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `304A DORM 304 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 102 } }, { "mark": "304B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `304B RESTROOM 302B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 EQ. EQ.`, "index": 103 } }, { "mark": "305A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `305A DORM 305 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 10"`, "index": 104 } }, { "mark": "305B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `305B RESTROOM 303B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 105 } }, { "mark": "306A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `306A DORM 306 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 106 } }, { "mark": "306B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `306B RESTROOM 306B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 WD-1: FLUSH - WOOD AL-1: FULL GLASS-ALUMINUM HM-2: VISION LITE-HOLLOW METAL WD-2: LOUVER - WOOD TYPE-1: HOLLOW METAL TYPE-2: HOLLOW METAL 04/15/2`, "index": 107 } }, { "mark": "307A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `307A DORM 307 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 HM-1: FLUSH - HOLLOW METAL`, "index": 108 } }, { "mark": "307B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `307B RESTROOM 307B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 109 } }, { "mark": "308A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `308A DORM 308 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 110 } }, { "mark": "308B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `308B RESTROOM 306B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 111 } }, { "mark": "309A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `309A DORM 309 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 EXP. DATE: 12/31/26`, "index": 112 } }, { "mark": "309B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `309B RESTROOM 307B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 A-602 SCALE: 1/4" = 1'-0" A-602 SCALE: 1/4" = 1'-0"`, "index": 113 } }, { "mark": "310A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `310A DORM 310 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 114 } }, { "mark": "310B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `310B RESTROOM 310B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 115 } }, { "mark": "311A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `311A DORM 311 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 116 } }, { "mark": "311B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `311B RESTROOM 311B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 117 } }, { "mark": "312A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `312A DORM 312 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 MASONRY WITH`, "index": 118 } }, { "mark": "312B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `312B RESTROOM 310B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 STEEL LINTEL`, "index": 119 } }, { "mark": "313A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `313A DORM 313 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 120 } }, { "mark": "313B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `313B RESTROOM 311B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 121 } }, { "mark": "314A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `314A DORM 314 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 STUD BOX HEADER`, "index": 122 } }, { "mark": "314B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `314B RESTROOM 314B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 5/8" SEALANT @ INTERIOR STUD WALL, AS`, "index": 123 } }, { "mark": "315A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `315A ACCESSIBLE DORM 315 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.02 SCHEDULED`, "index": 124 } }, { "mark": "315B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `315B ACCESSIBLE RESTROOM 315B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2`, "index": 125 } }, { "mark": "316A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `316A DORM 316 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 SIDES)`, "index": 126 } }, { "mark": "316B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `316B RESTROOM 314B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 2" H.M. DOOR FRAME PER 11 5/8"`, "index": 127 } }, { "mark": "317A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `317A DORM 317 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 PRE-FINISHED METAL DOOR SCHEDULE V.I.F.`, "index": 128 } }, { "mark": "317B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `317B RESTROOM 317B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 FLASHING W/ DRIP.`, "index": 129 } }, { "mark": "318A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `318A DORM 318 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 REFER TO SPECS.`, "index": 130 } }, { "mark": "318B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `318B RESTROOM 318B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 131 } }, { "mark": "319A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `319A DORM 319 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 1/2" 5 3/4" VARIES`, "index": 132 } }, { "mark": "319B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `319B RESTROOM 317B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 133 } }, { "mark": "320A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `320A DORM 320 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 134 } }, { "mark": "321B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `321B RESTROOM 321B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 A-602 SCALE: 1 1/2" = 1'-0" A-602 SCALE: 1 1/2" = 1'-0" GROUT`, "index": 135 } }, { "mark": "322A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `322A DORM 322 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 136 } }, { "mark": "322B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `322B RESTROOM 322B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 137 } }, { "mark": "323A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `323A DORM 323 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 BACKER ROD (TYP. 8"`, "index": 138 } }, { "mark": "323B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `323B RESTROOM 321B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 2" WIRE ANCHOR`, "index": 139 } }, { "mark": "324A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `324A DORM 324 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 5/8" OFFICE OF ADMINISTRATION`, "index": 140 } }, { "mark": "324B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `324B RESTROOM 322B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 141 } }, { "mark": "325A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `325A DORM 325 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 5 3/4"`, "index": 142 } }, { "mark": "325B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `325B RESTROOM 325B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 HOLLOW METAL`, "index": 143 } }, { "mark": "326A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `326A ACCESSIBLE DORM 326 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.02 1 DOOR FRAME. SEE DESIGN AND CONSTRUCTION`, "index": 144 } }, { "mark": "326B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `326B ACCESSIBLE RESTROOM 326B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2 H.M. DOOR, AS SCHEDULED DOOR SCHEDULE`, "index": 145 } }, { "mark": "327A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `327A DORM 327 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1 H.M. DOOR FRAME`, "index": 146 } }, { "mark": "327B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `327B RESTROOM 325B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 1/2" DOOR, AS SCHEDULED GROUT SOLID`, "index": 147 } }, { "mark": "328A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `328A DORM 328 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 148 } }, { "mark": "328B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `328B RESTROOM 328B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 149 } }, { "mark": "329A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `329A DORM 329 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 150 } }, { "mark": "330B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `330B RESTROOM 328B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2 A-602 SCALE: 1 1/2" = 1'-0" A-602 SCALE: 1 1/2" = 1'-0" A-602 SCALE: 1 1/2" = 1'-0"`, "index": 151 } }, { "mark": "331A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `331A DORM 331 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 07.03 1`, "index": 152 } }, { "mark": "331B", "location": null, "type": null, "material": null, "width_in": 24, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `331B RESTROOM 329B WD-1 2' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 06.01 1&2`, "index": 153 } }, { "mark": "332A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `332A LIVING ROOM 332 WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 07.03`, "index": 154 } }, { "mark": "332B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `332B RESTROOM 332B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 2 INTERIOR/EXTERIOR & INSTALL`, "index": 155 } }, { "mark": "332C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `332C BEDROOM 332C WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 3 EMERGENCY GENERATOR,`, "index": 156 } }, { "mark": "332D", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `332D BEDROOM 332D WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.01 3 4 1/2" MULTIPLE ASSETS`, "index": 157 } }, { "mark": "333B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `333B CORRIDOR 341 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02 STAINLESS STEEL FLAT HEAD ALUMINUM DOOR. MSHP GENERAL`, "index": 158 } }, { "mark": "334", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `334 UNISEX RESTROOM 334A WD-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 06.02 3 CONCRETE SCREW STAINLESS STEEL SEE SPECS. HEADQUARTERS COMPLEX`, "index": 159 } }, { "mark": "335B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `335B CORRIDOR 341 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02 THRESHOLD SET IN 1/8" SEALANT JOINT`, "index": 160 } }, { "mark": "336A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `336A JANITOR CLOSET 336A WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.03 1&2`, "index": 161 } }, { "mark": "336B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `336B STORAGE 336B WD-1 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 09.02 CONCRETE HEIGHT (TYP.)`, "index": 162 } }, { "mark": "337", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `337 CLEAN LINEN 337 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 09.04 1&2 CONCRETE SLAB FLOORING FINISH LEGEND`, "index": 163 } }, { "mark": "338B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `338B CORRIDOR 340 HM-2 3' - 0" 6' - 8" 1 3/4" TYP-2 4/A602 5/A602 3/4 HR 05.02 EXTERIOR INTERIOR EXTERIOR 1/2" INTERIOR`, "index": 164 } }, { "mark": "339", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 80, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 45, "row": { "page": 45, "text": `339 STORAGE 339 WD-1 3' - 0" 6' - 8" 1 3/4" EXIST N/A N/A N/A 3/4 HR 09.02 1`, "index": 165 } }], "sets": {}, "notes": ["Real harvested bid set _R2502-01 REBID Final Bid Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read.", "No floor plan: the plan reader reads the A-105/A-106/A-107 title blocks as 'SHEET 23 OF 147' and so on, and classifies none as a floor plan. The doors stand in schedule order along one schematic corridor; no plan position is claimed."], "layout": { "source": "schematic", "note": "Schematic layout from the schedule: no floor plan was read for these doors Doors stand in schedule order along one corridor." }, "set": { "sha16": "f97e99f88a931e74", "project": "_R2502-01 REBID Final Bid Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_R2502-01%20REBID%20Final%20Bid%20Plans.pdf", "pdf_sha256": "f97e99f88a931e749a6f2a08027d47be715dbace3b4642ab6eff40f6ace2f2fd", "rows": 166, "door_rows": 162, "not_door_rows": [{ "mark": "1", "page": 44, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }, { "mark": "2", "page": 44, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }, { "mark": "3", "page": 44, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }, { "mark": "4", "page": 44, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }], "doors_on_plan": 0, "plan_sheets": [], "no_plan_reason": "the plan reader reads the A-105/A-106/A-107 title blocks as 'SHEET 23 OF 147' and so on, and classifies none as a floor plan", "input": "tools/accuracy/g020/f97e99f88a931e74.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "43a1f0db3f7ff345": { "project": "_O2604-01 Final Bid Plans", "source": "harvested-set", "doors": [{ "mark": "201", "location": null, "type": null, "material": null, "width_in": 42, "height_in": 90, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 14, "plan": { "sheet": "A111", "page": 6, "x": 21.44, "z": 117.67, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 14, "text": `201 A WD. 3' - 6" 7' - 6" 2" WD. 1 ETR 1,2,3`, "index": 0 } }, { "mark": "202", "location": null, "type": null, "material": null, "width_in": 42, "height_in": 90, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 14, "plan": { "sheet": "A111", "page": 6, "x": 36.89, "z": 117.67, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 14, "text": `202 A WD. 3' - 6" 7' - 6" 2" WD. 1 ETR 1,2,3 OR`, "index": 1 } }, { "mark": "203", "location": null, "type": null, "material": null, "width_in": 42, "height_in": 90, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 14, "plan": { "sheet": "A111", "page": 6, "x": 52.44, "z": 117.67, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 14, "text": `203 A WD. 3' - 6" 7' - 6" 2" WD. 1 ETR 1,2,3`, "index": 2 } }, { "mark": "204", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 14, "plan": { "sheet": "A111", "page": 6, "x": 0, "z": 120.44, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 14, "text": `204 B WD. 3' - 0" 7' - 0" 2" WD. 3 - TR`, "index": 3 } }, { "mark": "301", "location": null, "type": null, "material": null, "width_in": 42, "height_in": 90, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 14, "plan": { "sheet": "A111", "page": 6, "x": 21.44, "z": 0, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 14, "text": `301 A WD. 3' - 6" 7' - 6" 2" WD. 2 ETR 2,3`, "index": 5 } }, { "mark": "302", "location": null, "type": null, "material": null, "width_in": 42, "height_in": 90, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 14, "plan": { "sheet": "A111", "page": 6, "x": 52.44, "z": 0, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 14, "text": `302 A WD. 3' - 6" 7' - 6" 2" WD. 2 ETR 2,3`, "index": 6 } }], "sets": {}, "notes": ["Real harvested bid set _O2604-01 Final Bid Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A111", "page": 6, "title": "FLOOR PLANS", "scale": `1/8" = 1'-0", 1/8" = 1'-0", 1/8" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 52, "depth_ft": 120, "rooms": [{ "number": "1", "name": "SOUTH MEZZANINE", "corridor": false, "x": 37, "z": 74.78 }] }], "counts": { "doors": 6, "on_plan": 6, "rooms": 1, "corridors": 0, "unmatched_tags": 1 }, "unmatched_tags": [{ "tag": "205", "sheet": "A111", "page": 6 }], "not_on_plan": [], "note": "Laid out from the floor plan A111 (FLOOR PLANS) p.6: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet." }, "set": { "sha16": "43a1f0db3f7ff345", "project": "_O2604-01 Final Bid Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_O2604-01%20Final%20Bid%20Plans.pdf", "pdf_sha256": "43a1f0db3f7ff3453f4ee2f02f83591820eb562d31175a97c62065f2f9421468", "rows": 7, "door_rows": 6, "not_door_rows": [{ "mark": "A601", "page": 14, "text": null, "reason": "the mark begins no row of the schedule (found only inside another row's text, or not on a schedule line)" }], "doors_on_plan": 6, "plan_sheets": [{ "sheet": "A111", "page": 6, "title": "FLOOR PLANS" }], "input": "tools/accuracy/g020/43a1f0db3f7ff345.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "3fd2388877347d09": { "project": "_T2502-01 - Final Plans", "source": "harvested-set", "doors": [{ "mark": "002", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 13, "plan": { "sheet": "A-101", "page": 7, "x": 0, "z": 74.22, "room": "04", "room_name": "MEETING ROOM", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 4.22, "room_z": 85.78, "building": 0 }, "row": { "page": 13, "text": `002 REPLACE 3'-0" X 7'-0" STOREFRONT PRE-FIN PER MFR. ALUMINUM PRE-FIN 1 MATCH EXISTING HEAD HEIGHT`, "index": 1 } }, { "mark": "003", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 13, "plan": { "sheet": "A-101", "page": 7, "x": 72.89, "z": 95.67, "room": "17", "room_name": "KITCHEN", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 82.33, "room_z": 80.78, "building": 0 }, "row": { "page": 13, "text": `003 REPLACE 3'-0" X 7'-0" HOLLOW METAL/FRP PRE-FIN MATCH EXIST HM/FRP PAINT 1 MATCH EXISTING HEAD HEIGHT`, "index": 2 } }], "sets": {}, "notes": ["Real harvested bid set _T2502-01 - Final Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A-101", "page": 7, "title": "FLOOR PLAN", "scale": `1/8" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 175, "depth_ft": 123, "rooms": [{ "number": "10", "name": "VAULT", "corridor": false, "x": 135.56, "z": 0 }, { "number": "11", "name": "ARMS", "corridor": false, "x": 149.67, "z": 0 }, { "number": "09", "name": "STOR", "corridor": false, "x": 89.89, "z": 0.33 }, { "number": "12", "name": "STOR", "corridor": false, "x": 158.56, "z": 0.33 }, { "number": "08", "name": "CLASS ROOM", "corridor": false, "x": 21.89, "z": 2.44 }, { "number": "13", "name": "STOR", "corridor": false, "x": 175.22, "z": 2.44 }, { "number": "07", "name": "OFFICE", "corridor": false, "x": 12.89, "z": 18.78 }, { "number": "06", "name": "OFFICE", "corridor": false, "x": 12.89, "z": 31.89 }, { "number": "02", "name": "DRILL HALL", "corridor": true, "x": 79.22, "z": 43.22 }, { "number": "01", "name": "VESTIBULE", "corridor": true, "x": 12.89, "z": 43.89 }, { "number": "05", "name": "OFFICE", "corridor": false, "x": 12.89, "z": 55.89 }, { "number": "04", "name": "OFFICE", "corridor": false, "x": 12.89, "z": 68.56 }, { "number": "16", "name": "WOMAN'S ROOM", "corridor": false, "x": 102.11, "z": 77.89 }, { "number": "15", "name": "MEN'S ROOM", "corridor": false, "x": 123.56, "z": 77.89 }, { "number": "17", "name": "KITCHEN", "corridor": false, "x": 82.33, "z": 80.78 }, { "number": "04", "name": "MEETING ROOM", "corridor": false, "x": 4.22, "z": 85.78 }, { "number": "03", "name": "OFFICES", "corridor": false, "x": 32.11, "z": 85.78 }, { "number": "18", "name": "UTILITY", "corridor": false, "x": 57.67, "z": 84.89 }, { "number": "14", "name": "BUNK ROOM", "corridor": false, "x": 156.56, "z": 84.11 }, { "number": "1", "name": "LEVEL 1", "corridor": false, "x": 116.67, "z": 119.89 }, { "number": "1", "name": "NEW CONSTRUCTION KEYNOTES", "corridor": false, "x": 170.33, "z": 122 }, { "number": "2", "name": "NEW CONSTRUCTION KEYNOTES", "corridor": false, "x": 170.33, "z": 122.67 }] }], "counts": { "doors": 2, "on_plan": 2, "rooms": 22, "corridors": 2, "unmatched_tags": 2 }, "unmatched_tags": [{ "tag": "004", "sheet": "A-101", "page": 7 }, { "tag": "005", "sheet": "A-101", "page": 7 }], "not_on_plan": [], "note": "Laid out from the floor plan A-101 (FLOOR PLAN) p.7: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet." }, "set": { "sha16": "3fd2388877347d09", "project": "_T2502-01 - Final Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_T2502-01%20-%20Final%20Plans.pdf", "pdf_sha256": "3fd2388877347d09a41fbd92b6757eeb830e8b362ac1b73ef2d0182df8b78636", "rows": 3, "door_rows": 2, "not_door_rows": [{ "mark": "001", "page": 13, "text": `001 REPLACE 3'-0"/2'-6" X 7'-0" STOREFRONT PRE-FIN 6 3/4" W/ 4" HEAD ALUMINUM PRE-FIN 3 MATCH EXISTING HEAD HEIGHT`, "reason": "the row has no door width and height: not a door row (a grid number or a hardware-group digit the harvest regex picked up)" }], "doors_on_plan": 2, "plan_sheets": [{ "sheet": "A-101", "page": 7, "title": "FLOOR PLAN" }, { "sheet": "A-500", "page": 10, "title": "PLAN DETAILS" }], "input": "tools/accuracy/g020/3fd2388877347d09.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "4af80165bc367de8": { "project": "_C2419-01 Final Bid Plans", "source": "harvested-set", "doors": [{ "mark": "104A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 7, "plan": { "sheet": "A102", "page": 6, "x": 188.74, "z": 2.37, "room": "104", "room_name": "STAFF LOUNGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 175.85, "room_z": 3.56, "building": 0 }, "row": { "page": 7, "text": `104A 1 P20HM 3'-0" 7'-0" FCW00AL 0"- 0" SEE HM ELEVATION "A"`, "index": 0 } }, { "mark": "104B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 7, "plan": { "sheet": "A102", "page": 6, "x": 164.74, "z": 2.37, "room": "104", "room_name": "STAFF LOUNGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 175.85, "room_z": 3.56, "building": 0 }, "row": { "page": 7, "text": `104B 1 P20HM 3'-0" 7'-0" FCW00AL -0" 0" SEE HM ELEVATION "A"`, "index": 1 } }], "sets": {}, "notes": ["Real harvested bid set _C2419-01 Final Bid Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A102", "page": 6, "title": "FLOOR PLAN", "scale": `A102 SCALE: 1/8" = 1'-0", A102 SCALE: 1/8" = 1'-0", SCALE: 3/32" = 1'-0", SCALE: 3/32" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 308, "depth_ft": 100, "rooms": [{ "number": "124", "name": "TRASH STOR", "corridor": false, "x": 92.15, "z": 0 }, { "number": "104", "name": "STAFF LOUNGE", "corridor": false, "x": 175.85, "z": 3.56 }, { "number": "140", "name": "MEAT STORAGE REF.", "corridor": false, "x": 10.52, "z": 6.07 }, { "number": "137", "name": "COOLER #8", "corridor": false, "x": 42.96, "z": 6.37 }, { "number": "136", "name": "FREEZER #9", "corridor": false, "x": 61.19, "z": 6.81 }, { "number": "123", "name": "REFUSE", "corridor": false, "x": 77.48, "z": 6.81 }, { "number": "117", "name": "SERVING", "corridor": false, "x": 107.41, "z": 12.15 }, { "number": "105", "name": "STAFF DINING", "corridor": false, "x": 137.04, "z": 13.93 }, { "number": "122", "name": "SCULLERY", "corridor": false, "x": 88.74, "z": 22.22 }, { "number": "139", "name": "COOLER #6", "corridor": false, "x": 8, "z": 27.26 }, { "number": "135", "name": "VEG. PREP", "corridor": false, "x": 57.93, "z": 29.33 }, { "number": "138", "name": "MEAT PREPERATION", "corridor": false, "x": 31.26, "z": 30.81 }, { "number": "121", "name": "CORRIDOR", "corridor": true, "x": 76, "z": 30.81 }, { "number": "118", "name": "OFFICE", "corridor": false, "x": 110.96, "z": 33.93 }, { "number": "106", "name": "VEST. STORAGE TOILET", "corridor": true, "x": 142.07, "z": 33.33 }, { "number": "107", "name": "VEST. STORAGE TOILET", "corridor": true, "x": 146.96, "z": 33.33 }, { "number": "108", "name": "VEST. STORAGE TOILET", "corridor": true, "x": 153.33, "z": 33.33 }, { "number": "109", "name": "WOMEN", "corridor": false, "x": 160.3, "z": 33.33 }, { "number": "B01", "name": "STAIR WELL", "corridor": false, "x": 244.15, "z": 33.48 }, { "number": "119", "name": "POTS & PANS", "corridor": false, "x": 93.78, "z": 39.11 }, { "number": "7005", "name": "PROJECT # C2419-01", "corridor": false, "x": 307.85, "z": 38.22 }, { "number": "103", "name": "PLATING", "corridor": false, "x": 169.63, "z": 46.37 }, { "number": "141", "name": "CORRIDOR", "corridor": true, "x": 48.59, "z": 51.7 }, { "number": "110", "name": "MAIN KITCHEN", "corridor": false, "x": 132.44, "z": 52.15 }, { "number": "102", "name": "DINING HALL", "corridor": true, "x": 196.89, "z": 54.37 }, { "number": "B02", "name": "BASEMENT", "corridor": false, "x": 237.78, "z": 55.26 }, { "number": "132", "name": "REFRIG.", "corridor": false, "x": 20.89, "z": 59.85 }, { "number": "126", "name": "STEWARD", "corridor": false, "x": 82.22, "z": 59.85 }, { "number": "142", "name": "SALLY PORT", "corridor": false, "x": 5.04, "z": 64.59 }, { "number": "127", "name": "CLOSET", "corridor": false, "x": 77.19, "z": 68 }, { "number": "128", "name": "CLOSET", "corridor": false, "x": 87.26, "z": 68 }, { "number": "133", "name": "DRY GOODS", "corridor": false, "x": 20, "z": 72.3 }, { "number": "129", "name": "BAKERY", "corridor": false, "x": 58.67, "z": 74.81 }, { "number": "116B", "name": "NEW RESTROOM", "corridor": false, "x": 73.78, "z": 74.07 }, { "number": "115", "name": "INMATES TOILET", "corridor": false, "x": 120.59, "z": 76.3 }, { "number": "143", "name": "VESTIBULE", "corridor": true, "x": 0, "z": 88.74 }, { "number": "144", "name": "TOILETS", "corridor": false, "x": 7.7, "z": 88 }, { "number": "134", "name": "STORAGE", "corridor": false, "x": 15.85, "z": 88 }, { "number": "131", "name": "FERMENT", "corridor": false, "x": 24.15, "z": 87.11 }, { "number": "116", "name": "UNIFORM STORAGE", "corridor": false, "x": 91.11, "z": 88.74 }, { "number": "114", "name": "INMATES LOCKER", "corridor": false, "x": 108.89, "z": 83.85 }, { "number": "112", "name": "JANITOR", "corridor": false, "x": 122.96, "z": 86.07 }, { "number": "111", "name": "DISHWASHING", "corridor": false, "x": 152.44, "z": 86.81 }, { "number": "113", "name": "SPRINKLER", "corridor": false, "x": 123.26, "z": 99.7 }] }], "counts": { "doors": 2, "on_plan": 2, "rooms": 44, "corridors": 7, "unmatched_tags": 0 }, "unmatched_tags": [], "not_on_plan": [], "note": "Laid out from the floor plan A102 (FLOOR PLAN) p.6: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet." }, "set": { "sha16": "4af80165bc367de8", "project": "_C2419-01 Final Bid Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_C2419-01%20Final%20Bid%20Plans.pdf", "pdf_sha256": "4af80165bc367de8e18a7dbc7a47880985963c19c94150036c1d500d947db64c", "rows": 2, "door_rows": 2, "not_door_rows": [], "doors_on_plan": 2, "plan_sheets": [{ "sheet": "A101", "page": 5, "title": "OVERALL FLOOR PLAN" }, { "sheet": "A102", "page": 6, "title": "FLOOR PLAN" }, { "sheet": "A602", "page": 8, "title": "PLANS AND ELEVATIONS" }], "input": "tools/accuracy/g020/4af80165bc367de8.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "89236ffa156fbaf5": { "project": "_T2147-01 - Final Plans", "source": "harvested-set", "doors": [{ "mark": "161", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `161 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 0 } }, { "mark": "162", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `162 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 1 } }, { "mark": "163", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `163 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 2 } }, { "mark": "164", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `164 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 3 } }, { "mark": "165A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `165A 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 4 } }, { "mark": "165B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `165B 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 5 } }, { "mark": "166", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `166 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 4`, "index": 6 } }, { "mark": "167A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `167A 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 7 } }, { "mark": "167B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `167B 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 8 } }, { "mark": "168A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `168A 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 3`, "index": 9 } }, { "mark": "169A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `169A 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM1 HM PNT-3 2/A601 6/A601 NONE 4`, "index": 10 } }, { "mark": "169B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `169B 3' - 0" 7' - 0" 1 3/4" F HM PNT-3 HM2 HM PNT-3 1/A601 5/A601 NONE 1`, "index": 11 } }, { "mark": "169C", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 80, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 42, "row": { "page": 42, "text": `169C 8' - 0" 6' - 8" 1 1/2" OH STEEL PNT-3 -- -- -- 3/A601 7/A601 NONE -`, "index": 12 } }, { "mark": "101A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 0, "z": 38.67, "room": "101", "room_name": "EXISTING BAYS", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 25.7, "room_z": 72.15, "building": 0 }, "row": { "page": 43, "text": `101A 3' - 0" 7' - 0" 1 3/4" F -- PNT-1 -- -- PNT-1 -- -- N/A --`, "index": 13 } }, { "mark": "101B", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 66.74, "z": 39.93, "room": "101", "room_name": "EXISTING BAYS", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 25.7, "room_z": 72.15, "building": 0 }, "row": { "page": 43, "text": `101B 3' - 0" 7' - 0" 1 3/4" F -- PNT-1 -- -- PNT-1 -- -- N/A --`, "index": 14 } }, { "mark": "102A", "location": null, "type": null, "material": null, "width_in": 144, "height_in": 168, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 78.74, "z": 41.11, "room": "102", "room_name": "READY BAYS", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 86.44, "room_z": 71.48, "building": 0 }, "row": { "page": 43, "text": `102A 12' - 0" 14' - 0" 2" OH STEEL PREF -- STEEL PREF 2/A501 4/A501 N/A N/A`, "index": 15 } }, { "mark": "102B", "location": null, "type": null, "material": null, "width_in": 144, "height_in": 168, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 91.7, "z": 41.11, "room": "102", "room_name": "READY BAYS", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 86.44, "room_z": 71.48, "building": 0 }, "row": { "page": 43, "text": `102B 12' - 0" 14' - 0" 2" OH STEEL PREF -- STEEL PREF 2/A501 4/A501 N/A N/A`, "index": 16 } }, { "mark": "102C", "location": null, "type": null, "material": null, "width_in": 144, "height_in": 168, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 77.7, "z": 98.07, "room": "102", "room_name": "READY BAYS", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 86.44, "room_z": 71.48, "building": 0 }, "row": { "page": 43, "text": `102C 12' - 0" 14' - 0" 2" OH STEEL PREF -- STEEL PREF 2/A501 4/A501 N/A N/A`, "index": 17 } }, { "mark": "102D", "location": null, "type": null, "material": null, "width_in": 144, "height_in": 168, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 91.7, "z": 98.07, "room": "102", "room_name": "READY BAYS", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 86.44, "room_z": 71.48, "building": 0 }, "row": { "page": 43, "text": `102D 12' - 0" 14' - 0" 2" OH STEEL PREF -- STEEL PREF 2/A501 4/A501 N/A N/A`, "index": 18 } }, { "mark": "103A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 102.81, "z": 61.11, "room": "103", "room_name": "STORAGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 113.19, "room_z": 49.26, "building": 0 }, "row": { "page": 43, "text": `103A 3' - 0" 7' - 0" 1 3/4" F HM PNT-1 1 HM PNT-1 2/A601 5/A601 N/A 5`, "index": 19 } }, { "mark": "103B", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 168, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 103.85, "z": 49.11, "room": "103", "room_name": "STORAGE", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 113.19, "room_z": 49.26, "building": 0 }, "row": { "page": 43, "text": `103B 8' - 0" 14' - 0" 2" OH STEEL PREF -- STEEL PREF 3/A601 6/A601 N/A N/A`, "index": 20 } }, { "mark": "104", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 100.3, "z": 72.37, "room": "104", "room_name": "MEDICAL STORAGE", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 103.11, "room_z": 67.63, "building": 0 }, "row": { "page": 43, "text": `104 3' - 0" 7' - 0" 1 3/4" F HM PNT-1 1 HM PNT-1 2/A601 5/A601 N/A 3`, "index": 21 } }, { "mark": "105", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 122.96, "z": 76.22, "room": "MC-1", "room_name": "SC-1", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 113.26, "room_z": 52.52, "building": 0 }, "row": { "page": 43, "text": `105 3' - 0" 7' - 0" 1 3/4" F HM PNT-1 1 HM PNT-1 2/A601 5/A601 N/A 4`, "index": 22 } }, { "mark": "106A", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 102, "z": 101.7, "room": "106", "room_name": "PERSONAL FITNESS AREA", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 112.74, "room_z": 84.67, "building": 0 }, "row": { "page": 43, "text": `106A 3' - 0" 7' - 0" 1 3/4" F HM PNT-1 1 HM PNT-1 1/A601 4/A601 7/A601 N/A 1`, "index": 23 } }, { "mark": "106B", "location": null, "type": null, "material": null, "width_in": 96, "height_in": 96, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 117.7, "z": 98.07, "room": "106", "room_name": "PERSONAL FITNESS AREA", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 112.74, "room_z": 84.67, "building": 0 }, "row": { "page": 43, "text": `106B 8' - 0" 8' - 0" 2" OH STEEL PREF -- STEEL PREF 2/A501 8/A601 N/A N/A`, "index": 24 } }, { "mark": "106C", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 43, "plan": { "sheet": "A113", "page": 27, "x": 100.44, "z": 76.52, "room": "106", "room_name": "PERSONAL FITNESS AREA", "room_by": "tag_number", "unsure": false, "also_on": [], "room_x": 112.74, "room_z": 84.67, "building": 0 }, "row": { "page": 43, "text": `106C 3' - 0" 7' - 0" 1 3/4" F HM PNT-1 1 HM PNT-1 2/A601 5/A601 N/A 2`, "index": 25 } }], "sets": {}, "notes": ["Real harvested bid set _T2147-01 - Final Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A113", "page": 27, "title": "MAIN LEVEL FLOOR PLAN - ALT. 1", "scale": `3/16" = 1'-0", 0 SCALE: 3/16" = 1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 155, "depth_ft": 102, "rooms": [{ "number": "SC-1", "name": "TAG", "corridor": false, "x": 70.22, "z": 0 }, { "number": "MC-1", "name": "TAG", "corridor": false, "x": 70.22, "z": 4.15 }, { "number": "103", "name": "STORAGE", "corridor": false, "x": 113.19, "z": 49.26 }, { "number": "MC-1", "name": "SC-1", "corridor": false, "x": 113.26, "z": 52.52 }, { "number": "104", "name": "MEDICAL STORAGE", "corridor": false, "x": 103.11, "z": 67.63 }, { "number": "105", "name": "STORAGE ROOM", "corridor": false, "x": 119.93, "z": 66.89 }, { "number": "MC-1", "name": "SC-1", "corridor": false, "x": 120, "z": 69.48 }, { "number": "MC-1", "name": "SC-1", "corridor": false, "x": 110.3, "z": 70.74 }, { "number": "101", "name": "EXISTING BAYS", "corridor": false, "x": 25.7, "z": 72.15 }, { "number": "102", "name": "READY BAYS", "corridor": false, "x": 86.44, "z": 71.48 }, { "number": "MC-1", "name": "SC-1", "corridor": false, "x": 86.59, "z": 75.26 }, { "number": "6298", "name": "PROJECT # T2147-01", "corridor": false, "x": 154.96, "z": 77.78 }, { "number": "106", "name": "PERSONAL FITNESS AREA", "corridor": false, "x": 112.74, "z": 84.67 }, { "number": "MC-1", "name": "SC-1", "corridor": false, "x": 110.74, "z": 89.63 }] }], "counts": { "doors": 26, "on_plan": 13, "rooms": 14, "corridors": 0, "unmatched_tags": 0 }, "unmatched_tags": [], "not_on_plan": ["161", "162", "163", "164", "165A", "165B", "166", "167A", "167B", "168A", "169A", "169B", "169C"], "note": "Laid out from the floor plan A113 (MAIN LEVEL FLOOR PLAN - ALT. 1) p.27: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet. Not tagged on any plan sheet: 161, 162, 163, 164, 165A, 165B, 166, 167A, 167B, 168A, 169A, 169B, 169C." }, "set": { "sha16": "89236ffa156fbaf5", "project": "_T2147-01 - Final Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_T2147-01%20-%20Final%20Plans.pdf", "pdf_sha256": "89236ffa156fbaf5275413b258fd4beac283fa8c54388a7ca660962e0f415a72", "rows": 26, "door_rows": 26, "not_door_rows": [], "doors_on_plan": 13, "plan_sheets": [{ "sheet": "A113", "page": 27, "title": "MAIN LEVEL FLOOR PLAN - ALT. 1" }, { "sheet": "A501", "page": 39, "title": "PLAN DETAILS" }], "input": "tools/accuracy/g020/89236ffa156fbaf5.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "977cec6301f40433": { "project": "_T2423-01 - Final Plans", "source": "harvested-set", "doors": [{ "mark": "114", "location": null, "type": null, "material": null, "width_in": 72, "height_in": 84, "size_known": true, "leaves": 2, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 10, "row": { "page": 10, "text": `114 B Elec. / Data Existing 6' - 0" 7' - 0" 1 3/4" Existing Existing Existing None 2 1, 2 111 110A 110 109 108 107 106 105 Project Name:`, "index": 1 } }], "sets": {}, "notes": ["Real harvested bid set _T2423-01 - Final Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read.", "No floor plan: the plan reader takes 'CHECKED BY: DESIGNED BY: GW&' as the title of A-101/A-102/A-401 and classifies none as a floor plan. The doors stand in schedule order along one schematic corridor; no plan position is claimed."], "layout": { "source": "schematic", "note": "Schematic layout from the schedule: no floor plan was read for these doors Doors stand in schedule order along one corridor." }, "set": { "sha16": "977cec6301f40433", "project": "_T2423-01 - Final Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_T2423-01%20-%20Final%20Plans.pdf", "pdf_sha256": "977cec6301f40433bfd05b46b7406a4efc0455466cb878a1a0171803fe910182", "rows": 2, "door_rows": 1, "not_door_rows": [{ "mark": "112", "page": 10, "text": `112 A Assembly Existing 14' - 0" 14' - 0" 1 1/2" Existing Existing Existing None 1 1, 2 Supply Closet Supply Storage Office 4 Office 3 Office 2 Office 1`, "reason": "the row has no door width and height: not a door row (a grid number or a hardware-group digit the harvest regex picked up)" }], "doors_on_plan": 0, "plan_sheets": [], "no_plan_reason": "the plan reader takes 'CHECKED BY: DESIGNED BY: GW&' as the title of A-101/A-102/A-401 and classifies none as a floor plan", "input": "tools/accuracy/g020/977cec6301f40433.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } },
  "2b7024ad75f57ddf": { "project": "_T2331-01 Final Bid Plans", "source": "harvested-set", "doors": [{ "mark": "101", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 16, "plan": { "sheet": "A-101", "page": 9, "x": 43, "z": 15.78, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 16, "text": `101 3'-0" 7'-0" HM-1 HMF-1 B8/A-501 A8/A-501 NO RATING NOTE 1,3`, "index": 0 } }, { "mark": "102", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 16, "plan": { "sheet": "A-101", "page": 9, "x": 57.78, "z": 15.83, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 16, "text": `102 3'-0" 7'-0" HM-1 HMF-1 B8/A-501 A8/A-501 NO RATING NOTE 1,3`, "index": 1 } }, { "mark": "103", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 16, "plan": { "sheet": "A-101", "page": 9, "x": 77.44, "z": 15.83, "room": "L15", "room_name": "C OF COLUMN TO C OF COLUMN", "room_by": "nearest_label", "unsure": true, "also_on": [], "room_x": 82.39, "room_z": 23.94, "building": 0 }, "row": { "page": 16, "text": `103 3'-0" 7'-0" HM-1 HMF-1 B8/A-501 A8/A-501 NO RATING NOTE 1,3`, "index": 2 } }, { "mark": "104", "location": null, "type": null, "material": null, "width_in": 36, "height_in": 84, "size_known": true, "leaves": 1, "rating": null, "frame": null, "panic": false, "set": null, "source_page": 16, "plan": { "sheet": "A-101", "page": 9, "x": 96.11, "z": 15.83, "room": null, "room_name": null, "room_by": null, "unsure": false, "also_on": [], "room_x": null, "room_z": null, "building": 0 }, "row": { "page": 16, "text": `104 3'-0" 7'-0" HM-1 HMF-1 B8/A-501 A8/A-501 NO RATING NOTE 1,3`, "index": 3 } }], "sets": {}, "notes": ["Real harvested bid set _T2331-01 Final Bid Plans: the door rows are the schedule rows the harvest read from the set's own schedule pages (not audited row by row); sizes come from each row's text; no hardware sets were read."], "layout": { "source": "plan", "buildings": [{ "sheet": "A-101", "page": 9, "title": "ARCHITECTURAL FLOOR PLAN", "scale": `1/4"=1'-0"`, "to_scale": true, "origin_x": 0, "width_ft": 123, "depth_ft": 61, "rooms": [{ "number": "A-101", "name": "D3 EXTERIOR ELEVATION KEY PLAN", "corridor": false, "x": 0, "z": 0 }, { "number": "L15", "name": "C OF COLUMN TO C OF COLUMN", "corridor": false, "x": 82.39, "z": 23.94 }, { "number": "6322", "name": "PROJECT # T2331-01", "corridor": false, "x": 122.83, "z": 35.83 }, { "number": "101", "name": "EXIT ACCESS HALLWAY", "corridor": true, "x": 34.39, "z": 39.89 }, { "number": "B4", "name": "FOUNDATION", "corridor": false, "x": 106.44, "z": 51.61 }, { "number": "A-101", "name": "A4 ARCHITECTURAL FLOOR PLAN", "corridor": false, "x": 40.11, "z": 60.89 }] }], "counts": { "doors": 4, "on_plan": 4, "rooms": 6, "corridors": 1, "unmatched_tags": 0 }, "unmatched_tags": [], "not_on_plan": [], "note": "Laid out from the floor plan A-101 (ARCHITECTURAL FLOOR PLAN) p.9: each door stands where its tag is drawn, in the room the plan gives it, at the sheet's printed scale. Walls and door swings are not read from the plan yet." }, "set": { "sha16": "2b7024ad75f57ddf", "project": "_T2331-01 Final Bid Plans", "source_url": "https://oa.mo.gov/sites/default/files/bid-opportunities/_T2331-01%20Final%20Bid%20Plans.pdf", "pdf_sha256": "2b7024ad75f57ddf04c0a5dd68ea80662f8fafc86390a6ad3c61ec6052c88357", "rows": 4, "door_rows": 4, "not_door_rows": [], "doors_on_plan": 4, "plan_sheets": [{ "sheet": "A-101", "page": 9, "title": "ARCHITECTURAL FLOOR PLAN" }], "input": "tools/accuracy/g020/2b7024ad75f57ddf.json (harvest schedule rows: not audited truth; see tools/accuracy/g020/REPORT.md)" } }
};
var MAX_TEXT = 6e4;
function registerSightXModelRoutes(router2) {
  router2.get("/api/sightx/sample", () => jsonResponse3({ success: true, model: attachPlan(sampleModel(), { found: false, reason: "sheet A9.01 comes with no floor plan." }) }));
  router2.get("/api/sightx/sets/:sha16", (request) => {
    const m = SETS[String(request.params.sha16 || "").toLowerCase()];
    if (!m) return jsonResponse3({ success: false, message: "No such set. Known: " + Object.keys(SETS).join(", ") }, 404);
    return jsonResponse3({ success: true, model: m });
  });
  router2.post("/api/sightx/model", async (request) => {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse3({ success: false, message: "invalid JSON body" }, 400);
    }
    if (body && body.subx && typeof body.subx === "object") {
      return jsonResponse3({ success: true, model: attachPlan(modelFromSubx(body.subx), body.plan && typeof body.plan === "object" ? body.plan : null) });
    }
    const text = typeof body?.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
    if (!text.trim()) return jsonResponse3({ success: false, message: "Paste a door schedule (text) or send a SubX session (subx)." }, 400);
    const model = parseSchedule(text, { project: typeof body.project === "string" && body.project.trim() ? body.project.trim() : "Pasted schedule" });
    if (!model.doors.length) {
      return jsonResponse3({ success: false, message: 'No doors found. Paste one door per line ("101 HM 3070 HW-1 Corridor") or a table with a header row (Door, Size, Type, Rating, Hardware set).', model }, 422);
    }
    return jsonResponse3({ success: true, model: attachPlan(model, { found: false, reason: "a pasted schedule comes with no floor plan." }) });
  });
}
__name(registerSightXModelRoutes, "registerSightXModelRoutes");
__name2(registerSightXModelRoutes, "registerSightXModelRoutes");
var PAYING = /* @__PURE__ */ new Set(["active", "trialing"]);
var list = /* @__PURE__ */ __name2((v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean), "list");
var OUTPUT_TIERS = Object.freeze({
  subx: ["subx", "takeoffx"],
  takeoffx: ["takeoffx", "subx"],
  propx: ["propx"],
  cutsheetx: ["cutsheetx"],
  huntx: ["huntx"]
  // saved searches and their new-notice counts
});
async function rows(db, sql, ...binds) {
  try {
    const r = await db.prepare(sql).bind(...binds).all();
    return r?.results || [];
  } catch (_) {
    return [];
  }
}
__name(rows, "rows");
__name2(rows, "rows");
async function outputAccess(env, userId, product, nowMs = Date.now()) {
  if (!env || !env.DB || !userId) return { paid: false, via: null, accessEndsAt: null };
  const db = env.DB;
  let user = null;
  try {
    user = await db.prepare("SELECT subscription_tier, subscription_status, trial_ends_at FROM users WHERE id = ?").bind(userId).first();
  } catch (_) {
    user = null;
  }
  if (!user) return { paid: false, via: null, accessEndsAt: null };
  const tiers = OUTPUT_TIERS[product] || [product];
  for (const s of await rows(db, "SELECT status, tiers, suite FROM weyland_subscriptions WHERE user_id = ?", userId)) {
    if (!PAYING.has(s.status)) continue;
    if (Number(s.suite)) return { paid: true, via: "suite", accessEndsAt: null };
    const t = list(s.tiers).find((x) => tiers.includes(x));
    if (t) return { paid: true, via: t, accessEndsAt: null };
  }
  if (user.subscription_tier === "subconp" && user.subscription_status === "active") {
    return { paid: true, via: "comped", accessEndsAt: null };
  }
  const end = Date.parse(user.trial_ends_at || "");
  if (Number.isFinite(end) && end > nowMs) {
    const offers = await rows(db, "SELECT checkout_session_id FROM weyland_purchases WHERE user_id = ? AND kind = 'offer' AND status = 'granted' LIMIT 1", userId);
    if (offers.length) return { paid: true, via: "offer", accessEndsAt: new Date(end).toISOString() };
  }
  return { paid: false, via: null, accessEndsAt: null };
}
__name(outputAccess, "outputAccess");
__name2(outputAccess, "outputAccess");
function paymentRequired(what) {
  return {
    success: false,
    error: "PAYMENT_REQUIRED",
    code: "PAYMENT_REQUIRED",
    message: `Reading, matching and reviewing are free. ${what} comes with the $100 first submittal (30 days of every product, no automatic charge) or a plan.`,
    upgradeUrl: "/pricing"
  };
}
__name(paymentRequired, "paymentRequired");
__name2(paymentRequired, "paymentRequired");
var ID = /^[A-Za-z0-9]{12}$/;
var MAX_BYTES = 4e5;
var ready = false;
async function ensure(db) {
  if (ready) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS sightx_models (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, project TEXT, doors INTEGER, model_json TEXT NOT NULL, created_at TEXT NOT NULL)").run();
  ready = true;
}
__name(ensure, "ensure");
__name2(ensure, "ensure");
function newId() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => a[x % a.length]).join("");
}
__name(newId, "newId");
__name2(newId, "newId");
function cleanModel(m) {
  const s = /* @__PURE__ */ __name2((v, n) => v == null ? null : String(v).slice(0, n), "s");
  const doors = (Array.isArray(m?.doors) ? m.doors : []).slice(0, 120).map((d) => ({
    mark: s(d.mark, 24),
    location: s(d.location, 80),
    type: s(d.type, 60),
    material: s(d.material, 20),
    width_in: Math.max(12, Math.min(144, Number(d.width_in) || 36)),
    height_in: Math.max(60, Math.min(168, Number(d.height_in) || 84)),
    size_known: !!d.size_known,
    leaves: d.leaves === 2 ? 2 : 1,
    rating: s(d.rating, 30),
    frame: s(d.frame, 40),
    panic: !!d.panic,
    set: s(d.set, 20),
    source_page: d.source_page == null ? null : Number(d.source_page) || null,
    source_sheet: d.source_sheet ? String(d.source_sheet).slice(0, 80) : null
  }));
  const sets = {};
  for (const [k, items] of Object.entries(m?.sets || {}).slice(0, 200)) {
    sets[String(k).slice(0, 20)] = (Array.isArray(items) ? items : []).slice(0, 40).map((it) => ({ type: s(it.type, 20), qty: Number(it.qty) || 1, label: s(it.label, 160), manufacturer: s(it.manufacturer, 60), catalog: s(it.catalog, 80), finish: s(it.finish, 20) }));
  }
  return { project: s(m?.project, 160) || "Corridor", source: s(m?.source, 20), doors, sets, notes: (Array.isArray(m?.notes) ? m.notes : []).slice(0, 10).map((n) => String(n).slice(0, 300)) };
}
__name(cleanModel, "cleanModel");
__name2(cleanModel, "cleanModel");
function registerSightXShareRoutes(router2, { authenticate: authenticate2 }) {
  async function who(request, env) {
    const { error, user } = await authenticate2(request, env);
    if (error || !user || user.ephemeral || !user.userId) return { error: jsonResponse3({ success: false, code: "SIGN_IN_REQUIRED", message: "Sign in to save and share a corridor." }, 401) };
    await ensure(env.DB);
    return { userId: String(user.userId) };
  }
  __name(who, "who");
  __name2(who, "who");
  router2.post("/api/sightx/models", async (request, env) => {
    const a = await who(request, env);
    if (a.error) return a.error;
    const text = await request.text();
    if (text.length > MAX_BYTES) return jsonResponse3({ success: false, message: "That corridor is too large to save." }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch (_) {
      return jsonResponse3({ success: false, message: "invalid JSON" }, 400);
    }
    const model = cleanModel(body.model);
    if (!model.doors.length) return jsonResponse3({ success: false, message: "Build a corridor first." }, 400);
    if (!(await outputAccess(env, a.userId, "sightx")).paid) return jsonResponse3(paymentRequired("Saving and sharing a corridor"), 402);
    const id = newId();
    const name = String(body.name || model.project).slice(0, 120);
    await env.DB.prepare("INSERT INTO sightx_models (id, user_id, name, project, doors, model_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, a.userId, name, model.project, model.doors.length, JSON.stringify(model), (/* @__PURE__ */ new Date()).toISOString()).run();
    return jsonResponse3({ success: true, id, name, url: `/sightx/?m=${id}` });
  });
  router2.get("/api/sightx/models", async (request, env) => {
    const a = await who(request, env);
    if (a.error) return a.error;
    const rows2 = (await env.DB.prepare("SELECT id, name, project, doors, created_at FROM sightx_models WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(a.userId).all()).results || [];
    return jsonResponse3({ success: true, models: rows2.map((r) => ({ ...r, url: `/sightx/?m=${r.id}` })) });
  });
  router2.get("/api/sightx/models/:id", async (request, env) => {
    const id = request.params.id;
    if (!ID.test(id)) return jsonResponse3({ success: false, message: "Not a SightX link." }, 404);
    await ensure(env.DB);
    const row = await env.DB.prepare("SELECT name, model_json, created_at FROM sightx_models WHERE id = ?").bind(id).first();
    if (!row) return jsonResponse3({ success: false, message: "This shared corridor was removed or never existed." }, 404);
    return jsonResponse3({ success: true, name: row.name, shared_at: row.created_at, model: JSON.parse(row.model_json) });
  });
  router2.delete("/api/sightx/models/:id", async (request, env) => {
    const a = await who(request, env);
    if (a.error) return a.error;
    await env.DB.prepare("DELETE FROM sightx_models WHERE id = ? AND user_id = ?").bind(request.params.id, a.userId).run();
    return jsonResponse3({ success: true });
  });
}
__name(registerSightXShareRoutes, "registerSightXShareRoutes");
__name2(registerSightXShareRoutes, "registerSightXShareRoutes");
var SHEET_SETS = { "4847b09e633103f7": { "set": { "label": "The WeylandAI Building, generated by tools/bidset/make.mjs", "page_count": 6, "rows_total": 102, "sha16": "4847b09e633103f7", "source_url": null, "tier": "exact", "pdf": "/api/sightx/sheets/4847b09e633103f7/set.pdf" }, "sheets": [{ "page": 2, "sheet": "A-101", "title": "FLOOR PLANS - DOOR TAGS", "width": 2592, "height": 1728, "scales": [`SCALE: 1/8" = 1'-0"`, `SCALE: 1/8" = 1'-0"`, `SCALE: 1/8" = 1'-0"`], "points_per_foot": [9] }], "tags": [{ "mark": "100A", "sheet": "A-101", "page": 2, "x": 394, "y": 304, "h": 11, "room": null, "room_name": "MAIN ENTRY", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "MAIN ENTRY", "size": `6'-0" x 7'-0"`, "width_inches": 72, "height_inches": 84, "pair": false, "door_type": "F", "frame_type": "3", "material": "AL", "fire_rating": "-", "hardware_group": "01", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "100A", "location": "MAIN ENTRY", "size": `6'-0" x 7'-0"`, "door_type": "F", "frame_type": "3", "material": "AL", "fire_rating": "-", "hardware_group": "01" }] }, { "mark": "107", "sheet": "A-101", "page": 2, "x": 446, "y": 304, "h": 11, "room": null, "room_name": "MEN", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "MEN", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "107", "location": "MEN", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "200", "sheet": "A-101", "page": 2, "x": 1124, "y": 304, "h": 11, "room": null, "room_name": "CORRIDOR", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "CORRIDOR", "size": `6'-0" x 7'-0"`, "width_inches": 72, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "2", "material": "WD", "fire_rating": "20 MIN.", "hardware_group": "07", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "200", "location": "CORRIDOR", "size": `6'-0" x 7'-0"`, "door_type": "B", "frame_type": "2", "material": "WD", "fire_rating": "20 MIN.", "hardware_group": "07" }] }, { "mark": "208", "sheet": "A-101", "page": 2, "x": 1176, "y": 304, "h": 11, "room": null, "room_name": "BREAK ROOM", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "BREAK ROOM", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "08", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "208", "location": "BREAK ROOM", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "08" }] }, { "mark": "300", "sheet": "A-101", "page": 2, "x": 1854, "y": 304, "h": 11, "room": null, "room_name": "CORRIDOR", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "CORRIDOR", "size": `6'-0" x 7'-0"`, "width_inches": 72, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "2", "material": "WD", "fire_rating": "20 MIN.", "hardware_group": "07", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "300", "location": "CORRIDOR", "size": `6'-0" x 7'-0"`, "door_type": "B", "frame_type": "2", "material": "WD", "fire_rating": "20 MIN.", "hardware_group": "07" }] }, { "mark": "308", "sheet": "A-101", "page": 2, "x": 1906, "y": 304, "h": 11, "room": null, "room_name": "PANTRY", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "PANTRY", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "08", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "308", "location": "PANTRY", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "08" }] }, { "mark": "100B", "sheet": "A-101", "page": 2, "x": 394, "y": 459, "h": 11, "room": null, "room_name": "VESTIBULE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "VESTIBULE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "F", "frame_type": "3", "material": "AL", "fire_rating": "-", "hardware_group": "10", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "100B", "location": "VESTIBULE", "size": `3'-0" x 7'-0"`, "door_type": "F", "frame_type": "3", "material": "AL", "fire_rating": "-", "hardware_group": "10" }] }, { "mark": "108", "sheet": "A-101", "page": 2, "x": 446, "y": 459, "h": 11, "room": null, "room_name": "BREAK ROOM", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "BREAK ROOM", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "08", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "108", "location": "BREAK ROOM", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "08" }] }, { "mark": "201", "sheet": "A-101", "page": 2, "x": 1124, "y": 459, "h": 11, "room": null, "room_name": "OPEN OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OPEN OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "201", "location": "OPEN OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "209", "sheet": "A-101", "page": 2, "x": 1176, "y": 459, "h": 11, "room": null, "room_name": "STORAGE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STORAGE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "209", "location": "STORAGE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05" }] }, { "mark": "301", "sheet": "A-101", "page": 2, "x": 1854, "y": 459, "h": 11, "room": null, "room_name": "EXECUTIVE SUITE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "EXECUTIVE SUITE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "301", "location": "EXECUTIVE SUITE", "size": `3'-0" x 7'-0"`, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "309", "sheet": "A-101", "page": 2, "x": 1906, "y": 459, "h": 11, "room": null, "room_name": "STORAGE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STORAGE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "309", "location": "STORAGE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05" }] }, { "mark": "101", "sheet": "A-101", "page": 2, "x": 394, "y": 614, "h": 11, "room": null, "room_name": "LOBBY", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "LOBBY", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "101", "location": "LOBBY", "size": `3'-0" x 7'-0"`, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "109", "sheet": "A-101", "page": 2, "x": 446, "y": 614, "h": 11, "room": null, "room_name": "STORAGE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STORAGE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "109", "location": "STORAGE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05" }] }, { "mark": "202", "sheet": "A-101", "page": 2, "x": 1124, "y": 614, "h": 11, "room": null, "room_name": "OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "202", "location": "OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "210", "sheet": "A-101", "page": 2, "x": 1176, "y": 614, "h": 11, "room": null, "room_name": "DATA CLOSET", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "DATA CLOSET", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "06", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "210", "location": "DATA CLOSET", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "06" }] }, { "mark": "302", "sheet": "A-101", "page": 2, "x": 1854, "y": 614, "h": 11, "room": null, "room_name": "EXECUTIVE OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "EXECUTIVE OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "302", "location": "EXECUTIVE OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "310", "sheet": "A-101", "page": 2, "x": 1906, "y": 614, "h": 11, "room": null, "room_name": "DATA CLOSET", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "DATA CLOSET", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "06", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "310", "location": "DATA CLOSET", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "06" }] }, { "mark": "102", "sheet": "A-101", "page": 2, "x": 394, "y": 769, "h": 11, "room": null, "room_name": "RECEPTION OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "RECEPTION OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "102", "location": "RECEPTION OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "110", "sheet": "A-101", "page": 2, "x": 446, "y": 769, "h": 11, "room": null, "room_name": null, "room_by": null, "matched_by": "exact", "also_on": [], "location": "IT / SERVER", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "06", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "110", "location": "IT / SERVER", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "06" }] }, { "mark": "203", "sheet": "A-101", "page": 2, "x": 1124, "y": 769, "h": 11, "room": null, "room_name": "OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "203", "location": "OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "211", "sheet": "A-101", "page": 2, "x": 1176, "y": 769, "h": 11, "room": null, "room_name": "STAIR 1", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STAIR 1", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "211", "location": "STAIR 1", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02" }] }, { "mark": "303", "sheet": "A-101", "page": 2, "x": 1854, "y": 769, "h": 11, "room": null, "room_name": "EXECUTIVE OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "EXECUTIVE OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "303", "location": "EXECUTIVE OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "311", "sheet": "A-101", "page": 2, "x": 1906, "y": 769, "h": 11, "room": null, "room_name": "STAIR 1", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STAIR 1", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "311", "location": "STAIR 1", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02" }] }, { "mark": "103", "sheet": "A-101", "page": 2, "x": 394, "y": 924, "h": 11, "room": null, "room_name": "CONFERENCE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "CONFERENCE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "103", "location": "CONFERENCE", "size": `3'-0" x 7'-0"`, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "111", "sheet": "A-101", "page": 2, "x": 446, "y": 924, "h": 11, "room": null, "room_name": "CORRIDOR", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "CORRIDOR", "size": `6'-0" x 7'-0"`, "width_inches": 72, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "2", "material": "WD", "fire_rating": "20 MIN.", "hardware_group": "07", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "111", "location": "CORRIDOR", "size": `6'-0" x 7'-0"`, "door_type": "B", "frame_type": "2", "material": "WD", "fire_rating": "20 MIN.", "hardware_group": "07" }] }, { "mark": "204", "sheet": "A-101", "page": 2, "x": 1124, "y": 924, "h": 11, "room": null, "room_name": "OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "204", "location": "OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "212", "sheet": "A-101", "page": 2, "x": 1176, "y": 924, "h": 11, "room": null, "room_name": "STAIR 2", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STAIR 2", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "212", "location": "STAIR 2", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02" }] }, { "mark": "304", "sheet": "A-101", "page": 2, "x": 1854, "y": 924, "h": 11, "room": null, "room_name": "BOARD ROOM", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "BOARD ROOM", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "304", "location": "BOARD ROOM", "size": `3'-0" x 7'-0"`, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "312", "sheet": "A-101", "page": 2, "x": 1906, "y": 924, "h": 11, "room": null, "room_name": "STAIR 2", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STAIR 2", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "312", "location": "STAIR 2", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02" }] }, { "mark": "104", "sheet": "A-101", "page": 2, "x": 394, "y": 1079, "h": 11, "room": null, "room_name": "OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "104", "location": "OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "112", "sheet": "A-101", "page": 2, "x": 446, "y": 1079, "h": 11, "room": null, "room_name": "STAIR 1", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STAIR 1", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "112", "location": "STAIR 1", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02" }] }, { "mark": "205", "sheet": "A-101", "page": 2, "x": 1124, "y": 1079, "h": 11, "room": null, "room_name": "CONFERENCE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "CONFERENCE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "205", "location": "CONFERENCE", "size": `3'-0" x 7'-0"`, "door_type": "B", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "213", "sheet": "A-101", "page": 2, "x": 1176, "y": 1079, "h": 11, "room": null, "room_name": null, "room_by": null, "matched_by": "exact", "also_on": [], "location": "COPY / PRINT", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "213", "location": "COPY / PRINT", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "305", "sheet": "A-101", "page": 2, "x": 1854, "y": 1079, "h": 11, "room": null, "room_name": "OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "305", "location": "OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "313", "sheet": "A-101", "page": 2, "x": 1906, "y": 1079, "h": 11, "room": null, "room_name": "MECHANICAL", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "MECHANICAL", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "313", "location": "MECHANICAL", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "60 MIN.", "hardware_group": "05" }] }, { "mark": "105", "sheet": "A-101", "page": 2, "x": 394, "y": 1234, "h": 11, "room": null, "room_name": "OFFICE", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "OFFICE", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "105", "location": "OFFICE", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "03" }] }, { "mark": "113", "sheet": "A-101", "page": 2, "x": 446, "y": 1234, "h": 11, "room": null, "room_name": "STAIR 2", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "STAIR 2", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "113", "location": "STAIR 2", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "90 MIN.", "hardware_group": "02" }] }, { "mark": "206", "sheet": "A-101", "page": 2, "x": 1124, "y": 1234, "h": 11, "room": null, "room_name": "WOMEN", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "WOMEN", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "206", "location": "WOMEN", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "214", "sheet": "A-101", "page": 2, "x": 1176, "y": 1234, "h": 11, "room": null, "room_name": "JANITOR", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "JANITOR", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "214", "location": "JANITOR", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05" }] }, { "mark": "306", "sheet": "A-101", "page": 2, "x": 1854, "y": 1234, "h": 11, "room": null, "room_name": "WOMEN", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "WOMEN", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "306", "location": "WOMEN", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "314", "sheet": "A-101", "page": 2, "x": 1906, "y": 1234, "h": 11, "room": null, "room_name": "ROOF ACCESS", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "ROOF ACCESS", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "09", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "314", "location": "ROOF ACCESS", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "09" }] }, { "mark": "106", "sheet": "A-101", "page": 2, "x": 394, "y": 1389, "h": 11, "room": null, "room_name": "WOMEN", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "WOMEN", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "106", "location": "WOMEN", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "114", "sheet": "A-101", "page": 2, "x": 446, "y": 1389, "h": 11, "room": null, "room_name": "JANITOR", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "JANITOR", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "114", "location": "JANITOR", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05" }] }, { "mark": "207", "sheet": "A-101", "page": 2, "x": 1124, "y": 1389, "h": 11, "room": null, "room_name": "MEN", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "MEN", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "207", "location": "MEN", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "215", "sheet": "A-101", "page": 2, "x": 1176, "y": 1389, "h": 11, "room": null, "room_name": "WELLNESS", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "WELLNESS", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "215", "location": "WELLNESS", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "307", "sheet": "A-101", "page": 2, "x": 1854, "y": 1389, "h": 11, "room": null, "room_name": "MEN", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "MEN", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "307", "location": "MEN", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "WD", "fire_rating": "-", "hardware_group": "04" }] }, { "mark": "315", "sheet": "A-101", "page": 2, "x": 1906, "y": 1389, "h": 11, "room": null, "room_name": "JANITOR", "room_by": "schedule_location", "matched_by": "exact", "also_on": [], "location": "JANITOR", "size": `3'-0" x 7'-0"`, "width_inches": 36, "height_inches": 84, "pair": false, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05", "door_pages": [3], "schedule_rows": [{ "page": 3, "mark": "315", "location": "JANITOR", "size": `3'-0" x 7'-0"`, "door_type": "A", "frame_type": "1", "material": "HM", "fire_rating": "-", "hardware_group": "05" }] }], "summary": { "marks_total": 48, "marks_placed": 48, "placed_rate": 1, "sheets_total": 1, "unplaced": [] } } };
var norm = /* @__PURE__ */ __name2((s) => String(s || "").toUpperCase().replace(/\s+/g, ""), "norm");
var tagKey = /* @__PURE__ */ __name2((m) => norm(String(m || "").replace(/\s*\[p\.?\s*\d+\]\s*$/i, "")), "tagKey");
var num = /* @__PURE__ */ __name2((v) => v == null || v === "" || !Number.isFinite(+v) ? null : +v, "num");
var blank = /* @__PURE__ */ __name2((v) => v == null || v === "" || v === "-" ? null : String(v), "blank");
function ftin(inches) {
  if (inches == null) return null;
  const f = Math.floor(inches / 12), i = Math.round((inches - f * 12) * 100) / 100;
  return f + "'-" + i + '"';
}
__name(ftin, "ftin");
__name2(ftin, "ftin");
function sizeText(w, h) {
  return w != null && h != null ? ftin(w) + " x " + ftin(h) : null;
}
__name(sizeText, "sizeText");
__name2(sizeText, "sizeText");
function tagOf(t) {
  return t ? {
    sheet: t.sheet,
    page: t.page,
    x: Math.round(t.x * 100) / 100,
    y: Math.round(t.y * 100) / 100,
    h: t.h != null ? Math.round(t.h * 100) / 100 : null,
    plan_room: blank(t.room),
    plan_room_name: blank(t.room_name),
    room_by: t.room_by || null,
    unsure: !!t.unsure,
    also_on: t.also_on || []
  } : null;
}
__name(tagOf, "tagOf");
__name2(tagOf, "tagOf");
function openingsFromRecord(rec) {
  const openings = rec.tags.map((t) => {
    const r = (t.schedule_rows || [])[0] || {};
    return {
      mark: t.mark,
      room: blank(t.location) || blank(t.room_name),
      size: blank(t.size) || sizeText(num(t.width_inches), num(t.height_inches)),
      width_inches: num(t.width_inches),
      height_inches: num(t.height_inches),
      pair: !!t.pair,
      hardware_group: blank(t.hardware_group),
      fire_rating: blank(t.fire_rating),
      door_type: blank(t.door_type),
      frame_type: blank(t.frame_type),
      material: blank(t.material),
      schedule: { page: r.page ?? (t.door_pages || [])[0] ?? null, row: null },
      note: t.note || null,
      tag: tagOf(t)
    };
  });
  for (const u of rec.summary.unplaced || []) openings.push({ mark: u.mark, room: null, size: null, width_inches: null, height_inches: null, pair: false, hardware_group: null, fire_rating: null, door_type: null, frame_type: null, material: null, schedule: { page: u.page ?? null, row: null }, note: u.reason || null, tag: null });
  return {
    sheets: rec.sheets.map((s) => ({ page: s.page, sheet: s.sheet, title: s.title, width: s.width, height: s.height })),
    openings,
    summary: { total: rec.summary.marks_total, placed: rec.summary.marks_placed, unplaced: openings.filter((o) => !o.tag).map((o) => o.mark) }
  };
}
__name(openingsFromRecord, "openingsFromRecord");
__name2(openingsFromRecord, "openingsFromRecord");
function roomFromNotes(notes) {
  const m = String(notes || "").match(/Room:\s*([^;]+)/i);
  return m ? m[1].trim() || null : null;
}
__name(roomFromNotes, "roomFromNotes");
__name2(roomFromNotes, "roomFromNotes");
function openingsFromSession(doors, plan) {
  const rows2 = (Array.isArray(doors) ? doors : []).filter((d) => d && d.mark);
  const tags = plan && Array.isArray(plan.tags) ? plan.tags : [];
  const byKey = /* @__PURE__ */ new Map();
  for (const t of tags) {
    const k = tagKey(t.mark);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(t);
  }
  const taken = /* @__PURE__ */ new Map();
  const openings = rows2.map((d) => {
    const k = tagKey(d.mark), list2 = byKey.get(k) || [], n = taken.get(k) || 0;
    const t = list2[n] || null;
    if (t) taken.set(k, n + 1);
    const src = d.source || {};
    const w = num(d.width_inches), h = num(d.height_inches);
    return {
      mark: String(d.mark),
      room: roomFromNotes(d.notes),
      size: sizeText(w, h) || blank(d.width),
      width_inches: w,
      height_inches: h,
      pair: d.pair === true || d.pair === 1,
      hardware_group: blank(d.hardware_group),
      fire_rating: blank(d.fire_rating),
      door_type: blank(d.door_type),
      frame_type: blank(d.frame_type),
      material: blank(d.door_material),
      schedule: { page: src.page ?? d.page_number ?? null, row: src.table_row ?? null },
      note: null,
      tag: tagOf(t)
    };
  });
  const sheets = (plan && Array.isArray(plan.plan_sheets) ? plan.plan_sheets : []).map((s) => ({ page: s.page, sheet: s.sheet, title: s.title || null }));
  return { sheets, openings, summary: { total: openings.length, placed: openings.filter((o) => o.tag).length, unplaced: openings.filter((o) => !o.tag).map((o) => o.mark) } };
}
__name(openingsFromSession, "openingsFromSession");
__name2(openingsFromSession, "openingsFromSession");
var CSV_COLUMNS = [
  ["mark", (o) => o.mark],
  ["room", (o) => o.room],
  ["size", (o) => o.size],
  ["width_in", (o) => o.width_inches],
  ["height_in", (o) => o.height_inches],
  ["pair", (o) => o.pair ? "yes" : "no"],
  ["hardware_group", (o) => o.hardware_group],
  ["fire_rating", (o) => o.fire_rating],
  ["door_type", (o) => o.door_type],
  ["frame_type", (o) => o.frame_type],
  ["schedule_page", (o) => o.schedule.page],
  ["schedule_row", (o) => o.schedule.row],
  ["plan_sheet", (o) => o.tag ? o.tag.sheet : null],
  ["plan_page", (o) => o.tag ? o.tag.page : null],
  ["tag_x_pt", (o) => o.tag ? o.tag.x : null],
  ["tag_y_pt", (o) => o.tag ? o.tag.y : null],
  ["placed", (o) => o.tag ? "yes" : "no"]
];
var cell = /* @__PURE__ */ __name2((v) => {
  v = v == null ? "" : String(v);
  return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}, "cell");
function openingsCsv(openings) {
  return [CSV_COLUMNS.map((c) => c[0]).join(","), ...openings.map((o) => CSV_COLUMNS.map((c) => cell(c[1](o))).join(","))].join("\r\n") + "\r\n";
}
__name(openingsCsv, "openingsCsv");
__name2(openingsCsv, "openingsCsv");
var MAX_BODY = 4 * 1024 * 1024;
function registerSightXSheetRoutes(router2, { pdfs = {}, sets = SHEET_SETS } = {}) {
  router2.get("/api/sightx/sheets/:sha16", (request) => {
    const rec = sets[String(request.params.sha16 || "").toLowerCase()];
    if (!rec) return jsonResponse3({ success: false, message: "No such set. The sheet view shows the WeylandAI Building (" + Object.keys(sets).join(", ") + ") and your own SubX uploads (WALK IT in SubX)." }, 404);
    const o = openingsFromRecord(rec);
    return jsonResponse3({ success: true, set: rec.set, ...o, csv: openingsCsv(o.openings) });
  });
  router2.get("/api/sightx/sheets/:sha16/:file", (request) => {
    const sha = String(request.params.sha16 || "").toLowerCase();
    const bytes = request.params.file === "set.pdf" && sets[sha] ? pdfs[sha] : null;
    if (!bytes) return jsonResponse3({ success: false, message: "No such file." }, 404);
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Cache-Control": "public, max-age=86400" } });
  });
  router2.post("/api/sightx/openings", async (request) => {
    const len = Number(request.headers.get("content-length") || 0);
    if (len > MAX_BODY) return jsonResponse3({ success: false, message: "Too large." }, 413);
    let body;
    try {
      body = await request.json();
    } catch (_) {
      return jsonResponse3({ success: false, message: "invalid JSON body" }, 400);
    }
    if (!body || !Array.isArray(body.doors)) return jsonResponse3({ success: false, message: "Send the session's doors (and its plan when SubX found one)." }, 400);
    const o = openingsFromSession(body.doors, body.plan && typeof body.plan === "object" ? body.plan : null);
    return jsonResponse3({ success: true, ...o, csv: openingsCsv(o.openings) });
  });
}
__name(registerSightXSheetRoutes, "registerSightXSheetRoutes");
__name2(registerSightXSheetRoutes, "registerSightXSheetRoutes");
var SHEET_PDFS = {
  "4847b09e633103f7": p0
};
async function verifyJWT(token, secret) {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token format");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT token");
  }
  const [encodedHeader, encodedPayload, providedSignature] = parts;
  const expectedSignature = await createHmacSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  if (providedSignature !== expectedSignature) {
    throw new Error("Invalid token signature");
  }
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1e3);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired");
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error("Token not yet valid");
  }
  return payload;
}
__name(verifyJWT, "verifyJWT");
__name2(verifyJWT, "verifyJWT");
async function authenticateRequest(request2, secret) {
  const authHeader = request2.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Invalid Authorization header format");
  }
  const token = authHeader.substring(7).trim();
  return await verifyJWT(token, secret);
}
__name(authenticateRequest, "authenticateRequest");
__name2(authenticateRequest, "authenticateRequest");
async function verifySignedResourceUrl(url, secret) {
  const expires = url.searchParams.get("expires");
  const sig = url.searchParams.get("sig");
  if (!expires || !sig) {
    return { valid: false, expired: false, error: "Missing expires or sig parameter" };
  }
  const expiresInt = parseInt(expires, 10);
  if (isNaN(expiresInt)) {
    return { valid: false, expired: false, error: "Invalid expires parameter" };
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now > expiresInt) {
    return { valid: false, expired: true, error: "URL has expired" };
  }
  const urlCopy = new URL(url.href);
  urlCopy.searchParams.delete("expires");
  urlCopy.searchParams.delete("sig");
  let cleanPath = urlCopy.pathname;
  if (urlCopy.searchParams.toString()) {
    cleanPath += "?" + urlCopy.searchParams.toString();
  }
  const payload = `${cleanPath}:${expires}`;
  const expectedSig = await createHmacSignature(payload, secret);
  if (sig !== expectedSig) {
    return { valid: false, expired: false, error: "Invalid signature" };
  }
  return { valid: true, expired: false };
}
__name(verifySignedResourceUrl, "verifySignedResourceUrl");
__name2(verifySignedResourceUrl, "verifySignedResourceUrl");
async function createHmacSignature(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  return base64UrlEncode(arrayBufferToString(signature));
}
__name(createHmacSignature, "createHmacSignature");
__name2(createHmacSignature, "createHmacSignature");
function base64UrlEncode(str) {
  const base64 = typeof str === "string" ? btoa(unescape(encodeURIComponent(str))) : btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
__name2(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(str) {
  const paddedStr = str.padEnd(str.length + (4 - str.length % 4) % 4, "=");
  const base64 = paddedStr.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(base64)));
}
__name(base64UrlDecode, "base64UrlDecode");
__name2(base64UrlDecode, "base64UrlDecode");
function arrayBufferToString(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}
__name(arrayBufferToString, "arrayBufferToString");
__name2(arrayBufferToString, "arrayBufferToString");
async function authenticateLocalSession(request2, env2) {
  const cookies = request2.headers.get("Cookie") || "";
  const sessionMatch = cookies.match(/weyland_session=([^;]+)/);
  if (!sessionMatch) return null;
  try {
    const session = await env2.DB.prepare(
      "SELECT * FROM weyland_sessions WHERE id = ? AND expires_at > datetime('now')"
    ).bind(sessionMatch[1]).first();
    if (session) {
      const nodeData = session.player_json ? JSON.parse(session.player_json) : {};
      const tenantId = nodeData.tenants && nodeData.tenants[0] ? nodeData.tenants[0].id : "ven_weyland";
      return {
        user: {
          sub: session.user_id,
          userId: session.user_id,
          // Rosetta: monolith reads request.user.userId
          id: session.user_id,
          email: session.email,
          name: nodeData.name || session.email,
          mhsId: session.mhs_id || nodeData.mhsId,
          role: nodeData.role || "member",
          tenants: nodeData.tenants || [],
          tenant_id: tenantId,
          // snake_case for fleet convention
          tenantId
          // camelCase for monolith convention
        }
      };
    }
  } catch (e) {
    console.log("[AUTH] Session lookup error:", e.message);
  }
  return null;
}
__name(authenticateLocalSession, "authenticateLocalSession");
__name2(authenticateLocalSession, "authenticateLocalSession");
async function authenticateLocalJwt(request2, env2) {
  const auth = request2.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === "fleet_authenticated") return null;
  try {
    const payload = await authenticateRequest(request2, env2.JWT_SECRET);
    return { user: payload };
  } catch (e) {
    return null;
  }
}
__name(authenticateLocalJwt, "authenticateLocalJwt");
__name2(authenticateLocalJwt, "authenticateLocalJwt");
async function authenticateViaAuthFor(request2, env2) {
  const auth = request2.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === "fleet_authenticated") return null;
  try {
    const verifyResp = await fetch("https://authfor.com/api/v1/verify", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (verifyResp.ok) {
      const identity = await verifyResp.json();
      if (identity && identity.email) {
        const localUser = await env2.DB.prepare(
          "SELECT id, email, name, tenant_id FROM users WHERE email = ?"
        ).bind(identity.email).first();
        if (localUser) {
          const tenantId = localUser.tenant_id || "ven_weyland";
          return {
            user: {
              sub: localUser.id,
              userId: localUser.id,
              id: localUser.id,
              email: localUser.email,
              name: localUser.name || identity.name,
              tenantId,
              tenant_id: tenantId
            }
          };
        }
        return { error: jsonResponse3({ error: "No WeylandAI account for this identity yet \u2014 subscribe at /pricing" }, 404) };
      }
    }
  } catch (e) {
    console.log("[Auth] AuthFor verify error:", e.message);
  }
  return authenticateViaEphemeral(token, env2);
}
__name(authenticateViaAuthFor, "authenticateViaAuthFor");
__name2(authenticateViaAuthFor, "authenticateViaAuthFor");
async function authenticateViaEphemeral(token, env2) {
  if (!token) return null;
  try {
    const verifyResp = await fetch("https://authfor.com/api/v1/ephemeral/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!verifyResp.ok) return null;
    const ephemeral = await verifyResp.json();
    if (!ephemeral || !ephemeral.id) return null;
    return {
      user: {
        ephemeral: true,
        sub: `eph_${ephemeral.id}`,
        userId: null,
        id: `eph_${ephemeral.id}`,
        email: null,
        name: ephemeral.displayName || "Guest",
        ephemeralToken: token,
        upgraded: !!ephemeral.upgraded,
        // Added 2026-09-09: found live via GET /api/projects/:id
        // returning D1_TYPE_ERROR for a real ephemeral session - that
        // route scopes by "WHERE tenant_id = ?" using user.tenantId,
        // which was undefined here. Same "ven_weyland" default the
        // AuthFor-account bridge (above in this file) and the local-
        // session path both already use, so an ephemeral guest can read
        // real, shared, tenant-scoped data (e.g. the seeded demo
        // project) the same way a real signed-in weylandai user does.
        tenantId: "ven_weyland",
        tenant_id: "ven_weyland"
      }
    };
  } catch (e) {
    console.log("[Auth] AuthFor ephemeral verify error:", e.message);
    return null;
  }
}
__name(authenticateViaEphemeral, "authenticateViaEphemeral");
__name2(authenticateViaEphemeral, "authenticateViaEphemeral");
async function checkSignedUrlAccess(url, env2) {
  const hasSigParams = url.searchParams.has("expires") && url.searchParams.has("sig");
  if (!hasSigParams) return null;
  const result = await verifySignedResourceUrl(url, env2.JWT_SECRET);
  if (result.valid) {
    console.log("[Auth] Signed URL access granted for:", url.pathname);
    return { user: null, signedUrlAccess: true };
  }
  const status = result.expired ? 410 : 401;
  return { error: jsonResponse3({ error: result.expired ? "Signed URL expired" : result.error }, status) };
}
__name(checkSignedUrlAccess, "checkSignedUrlAccess");
__name2(checkSignedUrlAccess, "checkSignedUrlAccess");
async function authenticate(request2, env2) {
  const url = new URL(request2.url);
  const localSessionResult = await authenticateLocalSession(request2, env2);
  if (localSessionResult) return localSessionResult;
  const localJwtResult = await authenticateLocalJwt(request2, env2);
  if (localJwtResult) return localJwtResult;
  const authForResult = await authenticateViaAuthFor(request2, env2);
  if (authForResult) return authForResult;
  const signedUrlResult = await checkSignedUrlAccess(url, env2);
  if (signedUrlResult) return signedUrlResult;
  return { error: jsonResponse3({ error: "Authentication required \u2014 sign in at /" }, 401) };
}
__name(authenticate, "authenticate");
__name2(authenticate, "authenticate");
var SECURITY_HEADERS = Object.freeze({
  // One day to start, as on the platform. No includeSubDomains: other hosts on
  // the zone are served elsewhere. No preload.
  "Strict-Transport-Security": "max-age=86400",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The homepage's single-page shell frames these pages from the same origin
  // (its overlay, ?embed=1); no other site may.
  "X-Frame-Options": "SAMEORIGIN",
  // MeetingX's room asks for the camera and microphone, standalone and inside
  // the homepage overlay (a same-origin frame); no other origin gets them.
  // Nothing on the site asks for location.
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()"
});
function withSecurityHeaders(response) {
  if (!response || response.status === 101 || response.webSocket) return response;
  let out;
  try {
    out = new Response(response.body, response);
  } catch {
    return response;
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  return out;
}
__name(withSecurityHeaders, "withSecurityHeaders");
__name2(withSecurityHeaders, "withSecurityHeaders");
function secured(handler) {
  return {
    ...handler,
    async fetch(request, env, ctx) {
      return withSecurityHeaders(await handler.fetch(request, env, ctx));
    }
  };
}
__name(secured, "secured");
__name2(secured, "secured");
var router = new NativeRouter();
router.get("/health", () => jsonResponse3({
  ok: true,
  worker: "weyland-sightx-worker"
}));
function serveSightX(request) {
  const bg = new URL(request.url).searchParams.get("embed") === "bg";
  return new Response(bg ? sightxHtml : sightxAppHtml, {
    // no-transform (S0, 2026-10-09): the zone's edge otherwise injects a beacon script from
    // static.cloudflareinsights.com into the HTML, a third-party request on a page that makes none.
    headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "public, max-age=60, no-transform" }
  });
}
__name(serveSightX, "serveSightX");
__name2(serveSightX, "serveSightX");
router.get("/sightx", serveSightX);
router.get("/sightx/", serveSightX);
router.addRoute("HEAD", "/sightx", serveSightX);
router.addRoute("HEAD", "/sightx/", serveSightX);
registerSightXWalkthroughRoutes(router);
registerSightXModelRoutes(router);
registerSightXShareRoutes(router, { authenticate });
registerSightXSheetRoutes(router, { pdfs: SHEET_PDFS });
var index_default = secured({
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  }
});
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
