# 01 · Designs

This folder contains the **actual website design code for all 14 pages**, with HTML and CSS separated. It includes the existing browser scripts and assets required to render dynamic screens. These files are exported from `02-frontend`; they are not mockups or screenshots.

The original visual reference lives in [Figma](https://www.figma.com/design/pOPskhvCKVF6aPYKMedHs5/BMU-CAMPUS-EATS?node-id=3-1141). Access depends on its sharing settings; the editable Figma document is not included here.

## Folder layout

```text
01-designs/
├── html/                 # All 14 page layouts
├── css/                  # Page styles plus shared styles
├── scripts/              # Rendering, interaction and animation code
├── assets/               # Images and SVG assets used by the pages
├── readme-banner.svg
└── README.md
```

## Page-by-page design code

| Page | HTML structure | Page CSS |
| :--- | :--- | :--- |
| Home | [index.html](html/index.html) | [home.css](css/home.css) |
| Shops | [shops.html](html/shops.html) | [shops.css](css/shops.css) |
| Shop menu | [menu.html](html/menu.html) | [menu.css](css/menu.css) |
| Login | [login.html](html/login.html) | [login.css](css/login.css) |
| Sign up | [register.html](html/register.html) | [register.css](css/register.css) |
| Student profile | [profile.html](html/profile.html) | [profile.css](css/profile.css) |
| Favourites | [favourites.html](html/favourites.html) | [favourites.css](css/favourites.css) |
| Offers | [offers.html](html/offers.html) | [offers.css](css/offers.css) |
| Cart | [cart.html](html/cart.html) | [cart.css](css/cart.css) |
| Checkout | [checkout.html](html/checkout.html) | [checkout.css](css/checkout.css) |
| Order history | [orders.html](html/orders.html) | [orders.css](css/orders.css) |
| Order tracking | [tracking.html](html/tracking.html) | [tracking.css](css/tracking.css) |
| Help | [help.html](html/help.html) | [help.css](css/help.css) |
| Administration | [admin.html](html/admin.html) | [admin.css](css/admin.css) |

Each HTML file links its required styles in the correct order. Page CSS must be used with its linked shared styles: [design.css](css/design.css), [site.css](css/site.css), [extras.css](css/extras.css) and, where used, [cart-motion.css](css/cart-motion.css).

## Preview the design code

Run `npm ci` once, then `npm start` from the repository root. Open **[the design preview](http://localhost:8765/designs/)**. Individual pages use URLs such as `/designs/login.html`, `/designs/profile.html` and `/designs/menu.html?shop=Greenox`.

The preview uses the copied HTML, CSS, scripts and assets in this folder. It connects to the same backend and saved data as the main website, so form submissions and orders are real project-demo actions. Account screens require login, tracking needs an order ID, and administration requires the configured admin password. Opening the HTML directly as a local file cannot supply these API-driven screens.

## Keep the copies correct

Edit the working website in `02-frontend`, then run:

```bash
npm run sync:designs
```

`npm start` also synchronizes these copies automatically. CSS, JavaScript and assets are copied unchanged; HTML changes only the stylesheet and script URL prefixes to load the exported files. Do not edit these generated copies separately: the next sync overwrites them. If a source file is deleted or renamed, remove its obsolete export too.

## Visual direction

Warm cream surfaces pair with espresso text and terracotta accents. Headings use **Playfair Display**; interface and body text use **Poppins**, loaded through Google Fonts.

| Colour | Hex | Use |
| :--- | :--- | :--- |
| Cream | `#F8EFE3` | Page background |
| White | `#FFFFFF` | Card surfaces |
| Espresso | `#321C18` | Primary text |
| Terracotta | `#B94B32` | Accents |
| Paprika | `#98351F` | Stronger accents |
| Beige | `#E9CBAA` | Secondary details |
| Muted grey | `#70645D` | Supporting text |

The exported shared styling lives in [site.css](css/site.css), with base layout in [design.css](css/design.css). The home interaction lives in [water-surface.js](scripts/water-surface.js).

## Contents

- [readme-banner.svg](readme-banner.svg): editable vector cover for this repository; it is not an application screenshot.
- [Design assets](assets): copies of the site's existing SVG and PNG artwork.

Keep approved screenshots and Figma exports alongside these folders. The working website source remains in `02-frontend`.
