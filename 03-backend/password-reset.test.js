const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const install = require('./password-reset');

async function setup(t, overrides = {}) {
  let time = Date.now();
  const student = { id: 'test-student', email: 'test@bmu.edu.in', hash: 'old-hash', salt: 'old-salt' };
  const students = [student], sent = [], sessions = new Map([['old-session', { id: student.id }], ['other-session', { id: 'other' }]]);
  let saves = 0;
  const app = express(); app.use(express.json());
  install(app, { students, sessions, persist(next) { saves++; students.splice(0, students.length, ...next); },
    now: () => time, sendCode: async (email, code) => { sent.push({ email, code }); }, ...overrides });
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  async function post(route, body) {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/password-reset/${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie') };
  }
  return { students, sessions, sent, post, advance: ms => { time += ms; }, saves: () => saves,
    request: () => post('request', { email: student.email }),
    confirm: code => post('confirm', { email: student.email, code, password: 'new-password-123' }) };
}
test('valid code updates salted password, revokes only owner sessions and cannot be reused', async t => {
  const x = await setup(t); const r = await x.request();
  assert.equal(r.status, 202); assert.equal(x.sent.length, 1);
  assert.match(x.sent[0].code, /^\d{6}$/); assert.equal(r.body.code, undefined);
  const result = await x.confirm(x.sent[0].code); assert.equal(result.status, 200);
  assert.equal(x.saves(), 1); assert.equal(x.sessions.has('old-session'), false); assert.equal(x.sessions.has('other-session'), true);
  assert.match(result.cookie, /bmu_session=/);
  const hash = await promisify(crypto.scrypt)('new-password-123', x.students[0].salt, 64);
  assert.equal(hash.toString('hex'), x.students[0].hash);
  assert.equal((await x.confirm(x.sent[0].code)).status, 400);
});
test('unknown accounts receive the same message but no email', async t => {
  const x = await setup(t); const known = await x.request();
  const unknown = await x.post('request', { email: 'unknown@bmu.edu.in' });
  assert.deepEqual(unknown, known); assert.equal(x.sent.length, 1);
});
test('code expires after ten minutes', async t => {
  const x = await setup(t); await x.request(); x.advance(600001);
  assert.equal((await x.confirm(x.sent[0].code)).status, 400); assert.equal(x.saves(), 0);
});
test('five wrong attempts invalidate even the correct code', async t => {
  const x = await setup(t); await x.request();
  const wrong = x.sent[0].code === '000000' ? '111111' : '000000';
  for (let i=0;i<5;i++) assert.equal((await x.confirm(wrong)).status, 400);
  assert.equal((await x.confirm(x.sent[0].code)).status, 400); assert.equal(x.saves(), 0);
});
test('resend replaces the previous code and immediate repeated request is limited', async t => {
  const x = await setup(t); await x.request();
  assert.equal((await x.request()).status, 429); x.advance(61000);
  assert.equal((await x.request()).status, 202); assert.equal(x.sent.length, 2);
  if (x.sent[0].code !== x.sent[1].code) assert.equal((await x.confirm(x.sent[0].code)).status, 400);
  assert.equal((await x.confirm(x.sent[1].code)).status, 200);
});
test('missing mail configuration fails explicitly, without claiming email delivery', async t => {
  const x = await setup(t, { sendCode: null }); assert.equal((await x.request()).status, 503);
});
test('malformed email and short password do not change account', async t => {
  const x = await setup(t);
  assert.equal((await x.post('request', { email: 'test@gmail.com' })).status, 400);
  await x.request();
  assert.equal((await x.post('confirm', { email: 'test@bmu.edu.in', code: x.sent[0].code, password: 'short' })).status, 400);
  assert.equal(x.saves(), 0);
});
test('simultaneous valid submissions can persist only once', async t => {
  const x = await setup(t); await x.request();
  const results = await Promise.all([x.confirm(x.sent[0].code), x.confirm(x.sent[0].code)]);
  assert.deepEqual(results.map(r=>r.status).sort(), [200, 400]); assert.equal(x.saves(), 1);
});
