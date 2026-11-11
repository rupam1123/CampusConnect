import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sendEmail = require('../backend/utils/sendEmail');

test('standalone mail cannot silently use inherited SMTP credentials', async () => {
  const keys = ['ENABLE_EMAIL_DELIVERY','OWNER_EMAIL','EMAIL_USER','EMAIL_PASS'];
  const original = Object.fromEntries(keys.map(key => [key,process.env[key]]));
  try {
    delete process.env.ENABLE_EMAIL_DELIVERY;
    process.env.EMAIL_USER = 'inherited-sender@example.invalid';
    process.env.EMAIL_PASS = 'test-only-placeholder';
    await assert.rejects(sendEmail('nobody@example.invalid','Test','Never sent'), /delivery is disabled/);
    process.env.ENABLE_EMAIL_DELIVERY = 'true';
    process.env.OWNER_EMAIL = 'owner@example.invalid';
    await assert.rejects(sendEmail('nobody@example.invalid','Test','Never sent'), /must match/);
  } finally {
    for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
  }
});
