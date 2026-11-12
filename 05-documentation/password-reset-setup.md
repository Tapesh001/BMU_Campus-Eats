# Password reset email setup

The reset page is `/forgot-password.html`. Configure these keys in the ignored root `.env` file:

```dotenv
BMU_MAIL_USER=your-sender@gmail.com
BMU_MAIL_APP_PASSWORD=your-google-app-password
```

Create an app password in your Google account after enabling two-step verification. Never use your normal Google password or commit credentials. Restart `npm start` after updating configuration.

Reset codes expire after ten minutes, are single-use, and allow five incorrect attempts. Request rate limits and a resend cooldown apply. Successful resets revoke existing sessions. Codes are stored as keyed hashes in memory and become invalid after a server restart. Unknown accounts get the same request response as registered accounts. A request response does not guarantee inbox delivery; delivery failures produce a generic server log without exposing the code.

Verify the flow with `node --test 03-backend/password-reset.test.js`. These tests use a fake sender; an actual mailbox test is still required after configuration.

Hosting must support Gmail SMTP and durable storage for the current JSON files. Render free services block SMTP; deploying there needs an HTTPS email provider and a durable database adapter. Do not deploy accounts or orders to an ephemeral filesystem.
