const { test } = require('node:test');
const assert = require('node:assert/strict');
const sender = require('./reset-email');
const env = { BMU_BREVO_API_KEY: 'test-key', BMU_MAIL_USER: 'sender@example.com' };
test('unconfigured HTTPS sender is disabled', () => {
  assert.equal(sender({}), null);
  assert.equal(sender({ BMU_BREVO_API_KEY: 'test-key' }), null);
});
test('sends reset code to the requested recipient over HTTPS', async () => {
  let captured;
  const send = sender(env, async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ messageId: 'accepted' }) };
  });
  await send('student@bmu.edu.in', '012345');
  assert.equal(captured.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(captured.options.headers['api-key'], 'test-key');
  const body = JSON.parse(captured.options.body);
  assert.deepEqual(body.to, [{ email: 'student@bmu.edu.in' }]);
  assert.equal(body.sender.email, env.BMU_MAIL_USER);
  assert.match(body.textContent, /012345/);
  assert.ok(captured.options.signal);
});
test('provider rejection and missing acceptance cannot report success', async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({}) }]) {
    await assert.rejects(sender(env, async () => response)('student@bmu.edu.in', '012345'), /provider/);
  }
});
