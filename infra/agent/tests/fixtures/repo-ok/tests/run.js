/* eslint-disable @typescript-eslint/no-require-imports --
   Throwaway fixture content baked into the agent image for
   infra/agent/test-local.sh. Deliberately plain CommonJS with no toolchain, so
   the harness has a real `npm`-less gate to pin and run. Never shipped. */
'use strict';
const assert = require('assert');
const math = require('../src/math');

assert.strictEqual(math.add(2, 2), 4, 'add(2,2) should be 4');
assert.strictEqual(math.subtract(5, 3), 2, 'subtract(5,3) should be 2');

console.log('fixture tests passed');
