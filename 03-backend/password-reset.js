const crypto = require('node:crypto');
const scrypt = require('node:util').promisify(crypto.scrypt);
const nodemailer = require('nodemailer');

function gmailSender(env = process.env) {
  const user = (env.BMU_MAIL_USER || '').trim();
  const pass = (env.BMU_MAIL_APP_PASSWORD || '').replace(/\s/g, '');
  if (!user || !pass) return null;
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000
  });
  return async (email, code) => {
    const result = await transport.sendMail({
      from: { name: 'BMU Campus Eats', address: user }, to: email,
      subject: 'Your Campus Eats password reset code',
      text: `Your Campus Eats password reset code is ${code}.\n\nIt expires in 10 minutes and can be used once. If you did not request this, ignore this email. Your password has not been changed.`
    });
    if (!result.accepted?.length) throw new Error('Mail not accepted');
  };
}

module.exports = function installPasswordReset(app, { students, persist, sessions, sendCode = gmailSender(), now = Date.now }) {
  const challenges = new Map(), limits = new Map();
  const secret = crypto.randomBytes(32);
  const lifetime = 10 * 60 * 1000;
  const digest = (email, code) => crypto.createHmac('sha256', secret).update(email + ':' + code).digest();
  const emailOf = body => typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const validEmail = email => email.length <= 160 && /^[^\s@]+@bmu\.edu\.in$/i.test(email);
  function prune() {
    for (const [key, value] of challenges) if (value.until <= now()) challenges.delete(key);
    for (const [key, value] of limits) if (value.until <= now()) limits.delete(key);
  }
  function allow(key, maximum, duration) {
    let value = limits.get(key);
    if (!value || value.until <= now()) value = { count: 0, until: now() + duration };
    value.count++; limits.set(key, value);
    return value.count <= maximum;
  }
  app.post('/api/password-reset/request', (req, res) => {
    prune();
    const email = emailOf(req.body);
    if (!validEmail(email)) return res.status(400).json({ error: 'Enter your registered @bmu.edu.in email.' });
    if (!sendCode) return res.status(503).json({ error: 'Password reset email is not configured yet. Please contact the project administrator.' });
    if (!allow('request-ip:' + req.ip, 20, 3600000) || !allow('request-email:' + email, 3, 3600000))
      return res.status(429).json({ error: 'Too many requests. Please try again in an hour.' });
    if (challenges.get(email)?.sentAt > now() - 60000)
      return res.status(429).json({ error: 'Please wait one minute before requesting another code.' });
    const student = students.find(entry => entry.email.toLowerCase() === email);
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const challenge = { studentId: student?.id, accountHash: student?.hash, hash: digest(email, code), until: now() + lifetime, sentAt: now(), attempts: 0, ready: false, busy: false };
    challenges.set(email, challenge);
    // Identical response and background delivery avoid exposing account existence.
    res.status(202).json({ message: 'If this email is registered, a code will arrive shortly. Check your inbox and spam folder. The code expires in 10 minutes.' });
    if (student) Promise.resolve().then(() => sendCode(email, code)).then(() => {
      if (challenges.get(email) === challenge) challenge.ready = true;
    }).catch(() => {
      if (challenges.get(email) === challenge) challenges.delete(email);
      console.error('Password reset email delivery failed. Check the private mail configuration.');
    });
  });
  app.post('/api/password-reset/confirm', async (req, res) => {
    prune();
    const email = emailOf(req.body), { code, password } = req.body;
    if (!allow('verify-ip:' + req.ip, 50, 3600000)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    if (!validEmail(email) || typeof code !== 'string' || !/^\d{6}$/.test(code))
      return res.status(400).json({ error: 'Enter your BMU email and the six-digit code.' });
    if (typeof password !== 'string' || password.length < 8 || password.length > 128)
      return res.status(400).json({ error: 'Use a password of 8–128 characters.' });
    const challenge = challenges.get(email);
    const invalid = () => res.status(400).json({ error: 'The code is invalid or expired. Request a new code if needed.' });
    if (!challenge || challenge.busy || !challenge.ready) return invalid();
    challenge.attempts++;
    if (challenge.attempts > 5 || !crypto.timingSafeEqual(challenge.hash, digest(email, code))) {
      if (challenge.attempts >= 5) challenges.delete(email);
      return invalid();
    }
    challenge.busy = true;
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await scrypt(password, salt, 64)).toString('hex');
      const student = students.find(entry => entry.id === challenge.studentId && entry.email.toLowerCase() === email);
      if (challenges.get(email) !== challenge || challenge.until <= now() || !student || student.hash !== challenge.accountHash) return invalid();
      persist(students.map(entry => entry.id === student.id ? { ...entry, salt, hash } : entry));
      challenges.delete(email);
      for (const [token, session] of sessions) if (session.id === student.id) sessions.delete(token);
      res.clearCookie('bmu_session', { path: '/', httpOnly: true, sameSite: 'strict' });
      res.json({ message: 'Password updated. Sign in with your new password.' });
    } finally {
      challenge.busy = false;
    }
  });
};
