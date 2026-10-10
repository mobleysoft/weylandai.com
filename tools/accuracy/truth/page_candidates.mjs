// A title plus mark and size evidence is enough for a door schedule: hardware
// is optional (residential and renovation schedules often omit that column).
import { electricalPanelPage } from './reader_b.mjs';

export function doorPageCandidate(text) {
  if (electricalPanelPage(text)) return false;
  const mark = /\b(MARK|TAG|NO\.?|NUMBER|#|SYM\.?|SYMBOL)\b/i.test(text);
  const title = /\b(?:DOOR|OPENING)(?:\s*(?:&|AND)\s*FRAME)?\s+SCHEDULE\b/i.test(text);
  const size = /\b(?:WIDTH|HEIGHT|SIZE)\b/i.test(text);
  if (title && mark && size) return true;
  // Preserve the earlier broad candidate path; extraction still rejects
  // neighbouring room/finish/equipment schedules within a candidate sheet.
  return /\bDOOR\b/i.test(text) && /\bSCHEDULE\b/i.test(text) &&
    /\b(HARDWARE|HDWR?|HW|H\/W|HDW\.?\s*SET|SET|GROUP)\b/i.test(text) && mark;
}
