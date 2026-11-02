# BMU Campus Eats

Install Node.js 22 or newer, run `npm ci`, then `npm start`.
Open http://127.0.0.1:3000. Registration, login and menus require the Express server.

## Second evaluation walkthrough

1. Open Login → Create account. Register with a demonstration BMU email and a password of at least eight characters.
2. Edit your hostel on Profile, save, and reload. Sign out and sign in using the registered email or student ID.
3. Open Shops and choose a shop to view its menu. Empty shops display a message until their menus are added.

Express saves registration and profile submissions to `.bmu-campus-eats/students.json` inside the OS user's home folder. Set `BMU_DATA_DIR` to choose a different private directory. Only salted password hashes are stored. Session cookies expire after eight hours or when the server restarts. Cart and demo order history use account-specific browser storage.

The JSON API exposes POST /api/register, POST /api/login, POST /api/logout, GET and PUT /api/profile, and GET /api/menus. The six shop catalogs are in menu-data.json. Stock quantities demonstrate local cart limits. Authentication is for this project and does not verify university enrollment.
