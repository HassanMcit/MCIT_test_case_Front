'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEnv } = require('../scripts/load-env.js');

test('dotenv parser removes quotes while preserving URL and value contents', () => {
  const values = parseEnv([
    '# ignored comment',
    'export AUTH_URL = "https://staging.example.invalid/"',
    "NEXTAUTH_URL='https://staging.example.invalid/auth' # trailing comment",
    'NEXT_PUBLIC_BASE_URL=https://api.example.invalid/path # comment',
    'AUTH_SECRET="synthetic-fixture-value"',
  ].join('\n'));

  assert.deepEqual(values, {
    AUTH_URL: 'https://staging.example.invalid/',
    NEXTAUTH_URL: 'https://staging.example.invalid/auth',
    NEXT_PUBLIC_BASE_URL: 'https://api.example.invalid/path',
    AUTH_SECRET: 'synthetic-fixture-value',
  });
});
