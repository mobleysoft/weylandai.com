import assert from 'node:assert/strict';
import {scheduleRows,scheduleDoorMarks} from './qualification.mjs';
assert.equal(scheduleRows('101A  3\'-0"  7\'-0"  A  HM  02  PAINTED').length,1);
assert.equal(scheduleRows('A101  36 x 84  A  HM  HW-02  COMMENT').length,1);
assert.equal(scheduleRows('101  3\'-0" x 7\'-0" x 1-3/4"  A  HM  02  COMMENT').length,1);
assert.equal(scheduleRows('101  see door schedule for hardware set 02').length,0);
assert.equal(scheduleRows('16           17          18          19          20                              21         22            23        24         25').length,0);
assert.deepEqual(scheduleDoorMarks('101  WD-1  3\'-0"  7\'-0"  F1  H1  04'),['101']);
console.log('Door row shapes: feet/inches, numeric size, thickness, middle hardware column and negative prose passed');
