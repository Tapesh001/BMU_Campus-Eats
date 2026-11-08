# BMU Campus Eats

Install Node.js 22 or newer, run `npm ci`, then `npm start`.
Open http://localhost:8765. Keep the server running while using the site.
The server listens on all network interfaces. On the same Wi-Fi, use this computer's IPv4 address with port 8765. Network and firewall rules may affect access.

## Ordering

Register with a BMU email, browse and filter restaurants, save favourites, add menu options to the cart and check out. Orders are project demonstrations with payment at pickup. Online payments and hostel delivery are proposed features. Tracking changes when an administrator updates the saved status.

Prices and coupons are checked on the server. Retry identifiers prevent duplicate orders. Old browser-only order history remains accessible alongside saved orders. Guest cart items transfer after login.

## Administration

Open `/admin.html`. Set `BMU_ADMIN_PASSWORD` in a private `.env` file or the server environment. The local setup has a generated password in `.env`; this file is ignored by Git. Administrators can manage menu items, stock, restaurant availability, order statuses and demo offers. Analytics are labelled as project demonstration data.

Optional settings are `PORT`, `HOST` and `BMU_DATA_DIR`. Defaults are port 8765, host 0.0.0.0, and `.bmu-campus-eats` inside the operating-system user's home directory. Registration/profile submissions are in `students.json`; orders, favourites, addresses and coupons are in `commerce.json`; edited restaurant catalogs are in `catalog.json`. Passwords use salted hashes. Sessions expire or end when the server restarts.

## Device access

A temporary Cloudflare Quick Tunnel can expose the running Express app over HTTPS to other devices. Its address changes on restart and requires the computer, Express and tunnel process to remain running. Permanent hosting requires a configured server with persistent storage.

## Current limitations

MongoDB integration from the third evaluation brief is still pending. The backend currently uses local JSON. Restaurant hours, ratings, delivery estimates and unconfirmed menu prices must be supplied before they can be shown as real information. Keep demo payment and order labels for project presentations.
