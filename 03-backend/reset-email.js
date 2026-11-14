// HTTPS delivery works on hosts that block outbound SMTP ports.
module.exports = function brevoSender(env = process.env, request = fetch) {
  const key = (env.BMU_BREVO_API_KEY || '').trim();
  const sender = (env.BMU_MAIL_USER || '').trim();
  if (!key || !sender) return null;
  return async (email, code) => {
    const response = await request('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        sender: { name: 'BMU Campus Eats', email: sender },
        to: [{ email }],
        subject: 'Your Campus Eats password reset code',
        textContent: `Your Campus Eats password reset code is ${code}.\n\nIt expires in 10 minutes and can be used once. If you did not request this, ignore this email. Your password has not been changed.`
      })
    });
    // Never include provider response bodies, codes or credentials in errors/logs.
    if (!response.ok) throw new Error('Reset email provider rejected delivery');
    const result = await response.json();
    if (!result.messageId) throw new Error('Reset email provider did not confirm acceptance');
  };
};
