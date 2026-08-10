/* eslint-disable @typescript-eslint/no-require-imports --
   Throwaway fixture content baked into the agent image for
   infra/agent/test-local.sh. Overlays repo-ok: the same tests, plus one
   assertion about the BOX instead of the code. Never shipped. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const math = require('../src/math');

assert.strictEqual(math.add(2, 2), 4, 'add(2,2) should be 4');
assert.strictEqual(math.subtract(5, 3), 2, 'subtract(5,3) should be 2');

// This file IS repository code, and the gate is the one thing that executes it.
// The BYOK key must already be unlinked by the time we get here — the harness
// reads it into memory before preflight, precisely so this read fails.
assert.ok(
  !fs.existsSync('/work/secrets/llm'),
  'the BYOK key file is still on disk while repository code runs',
);

console.log('fixture tests passed');
