import assert from 'node:assert/strict';
import {scheduleRows} from './qualification.mjs';
assert.equal(scheduleRows('101A  3\'-0"  7\'-0"  A  HM  02  PAINTED').length,1);
assert.equal(scheduleRows('A101  36 x 84  A  HM  HW-02  COMMENT').length,1);
assert.equal(scheduleRows('101  3\'-0" x 7\'-0" x 1-3/4"  A  HM  02  COMMENT').length,1);
assert.equal(scheduleRows('101  see door schedule for hardware set 02').length,0);
console.log('Door row shapes: feet/inches, numeric size, thickness, middle hardware column and negative prose passed');
