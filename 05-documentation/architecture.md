# Architecture & API guide

The browser loads pages, styles and scripts from Express. Browser scripts call the same server's `/api` routes. The server validates input, checks sessions and saves data to MongoDB.

```text
Browser: HTML + CSS + JavaScript
               |
               | fetch /api/...
               v
Express: server.js + commerce.js
               |
               | validation + session checks
               v
MongoDB app_state collection
```

## Source locations and public routes

| Source | Browser route |
| :--- | :--- |
| `02-frontend/pages/index.html` | `/` and `/index.html` |
| `02-frontend/pages/*.html` | `/<page>.html` |
| `02-frontend/styles/*` | `/styles/*` |
| `02-frontend/scripts/*` | `/scripts/*` |
| `02-frontend/assets/*` | `/assets/*` |

Old root stylesheet and browser-script URLs also resolve for compatibility. Backend files, `.env` and the seed catalog are not public static files. Menus are returned by `/api/menus`.

Run `npm start` from the root. [server.js](../03-backend/server.js) loads the root `.env` and installs [commerce.js](../03-backend/commerce.js).

## API map

| Area | Routes |
| :--- | :--- |
| Accounts | `POST /api/register`, `POST /api/login`, `POST /api/logout` |
| Profile | `GET/PUT /api/profile` |
| Discovery | `GET /api/menus`, `GET /api/offers` |
| Checkout | `POST /api/checkout/quote`, `POST /api/orders` |
| Orders | `GET /api/orders`, `GET /api/orders/:id` |
| Personal data | `GET/PUT /api/favourites`, `GET/PUT /api/addresses` |
| Admin login | `POST /api/admin/login` |
| Admin overview | `GET /api/admin/overview` |
| Admin orders | `PATCH /api/admin/orders/:id` |
| Admin restaurants | `PATCH /api/admin/restaurants/:shop` |
| Admin menu | `POST/PATCH/DELETE /api/admin/menu` |
| Admin offers | `POST /api/admin/offers`, `DELETE /api/admin/offers/:id` |

Send JSON bodies with `Content-Type: application/json`. Protected routes check account or admin sessions on the server. Browser requests use cookies; do not embed credentials in frontend scripts.

## Persistence and limits

See [data storage](../04-data/README.md) for the MongoDB document layout. The server loads data on startup and waits for MongoDB to acknowledge each write before reporting success. Run a single app instance with this snapshot storage model. Sessions live in memory and end when the server restarts.
