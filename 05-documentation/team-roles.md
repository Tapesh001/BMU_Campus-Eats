# Five-member work allocation

This is a proposed ownership plan for ongoing work. Existing history remains the record of earlier contributions. Add real names and GitHub usernames when assignments are confirmed.

Each page owner also owns its same-named CSS file in `02-frontend/styles` (`index.html` uses `home.css`).

| Member | Ownership | Files |
| :--- | :--- | :--- |
| **Tapesh — lead** | Backend, account APIs, validation, persistence, admin and integration | [server.js](../03-backend/server.js), [commerce.js](../03-backend/commerce.js), [admin.html](../02-frontend/pages/admin.html), [admin.css](../02-frontend/styles/admin.css), [admin.js](../02-frontend/scripts/admin.js), [package.json](../package.json), root README |
| **Member 2** | Design, homepage, shared appearance, motion, assets and help | [Designs](../01-designs), [index.html](../02-frontend/pages/index.html), [home.css](../02-frontend/styles/home.css), [design.css](../02-frontend/styles/design.css), [site.css](../02-frontend/styles/site.css), [water-surface.js](../02-frontend/scripts/water-surface.js), [cart-motion.js](../02-frontend/scripts/cart-motion.js), [cart-motion.css](../02-frontend/styles/cart-motion.css), [help.html](../02-frontend/pages/help.html), [help.css](../02-frontend/styles/help.css), [assets](../02-frontend/assets) |
| **Member 3** | Registration, login, profile and favourites frontend | [register.html](../02-frontend/pages/register.html), [login.html](../02-frontend/pages/login.html), [profile.html](../02-frontend/pages/profile.html), [favourites.html](../02-frontend/pages/favourites.html), matching CSS, [account.js](../02-frontend/scripts/account.js) |
| **Member 4** | Shops, menus, options, stock presentation, catalog and offers frontend | [shops.html](../02-frontend/pages/shops.html), [menu.html](../02-frontend/pages/menu.html), [offers.html](../02-frontend/pages/offers.html), matching CSS, [menu-data.json](../04-data/menu-data.json) |
| **Member 5** | Cart, checkout, order history and tracking frontend | [cart.html](../02-frontend/pages/cart.html), [checkout.html](../02-frontend/pages/checkout.html), [orders.html](../02-frontend/pages/orders.html), [tracking.html](../02-frontend/pages/tracking.html), matching CSS, [checkout.js](../02-frontend/scripts/checkout.js), [tracking.js](../02-frontend/scripts/tracking.js) |

## Shared files

[app.js](../02-frontend/scripts/app.js), [extras.js](../02-frontend/scripts/extras.js) and [extras.css](../02-frontend/styles/extras.css) cover multiple pages. Members edit the sections required for their feature; Tapesh coordinates and reviews overlapping changes. Do not split these scripts without checking dependent screens.

## What the lead should explain in evaluation

- How Express connects browser forms to authenticated APIs.
- How passwords, sessions and BMU-domain validation work.
- Why the server checks prices, options, stock and coupons again.
- Where JSON submissions are saved and how admin edits reach menus and tracking.
- How the five modules are integrated and tested; which requirements, including MongoDB, remain pending.

Each member should demonstrate their screens, explain their JavaScript changes and show their own reviewed pull requests.

## Collaboration workflow

Use **one shared repository, four invited collaborators, and a feature branch for each task**. Collaborator access lets members push; branches let them work separately from `main`.

1. The lead creates the new repository when ready and adds the project baseline once, preserving history where practical. Change the remote only after confirming the destination.
2. Invite the four members through repository collaborator settings.
3. Each member clones using their own account and configures their own name and verified email or GitHub private commit email.
4. Create a task branch, make changes, test, commit and push.
5. Open a pull request describing the change and validation; Tapesh reviews and merges it.
6. Update local `main` before the next task. Use branch protection and required reviews if supported by the repository plan and visibility.

Example for the menu owner:

```bash
git switch main
git pull --ff-only
git switch -c codex/member-4-menu-filters
# Edit and test the feature.
git add 02-frontend/pages/menu.html 02-frontend/styles/menu.css
git commit -m "Improve menu category filters"
git push -u origin codex/member-4-menu-filters
```

Stage any additional scripts actually changed. Other branches could be `codex/member-3-profile-validation` and `codex/member-5-checkout-summary`.

Individual commits and pull requests should reflect work each member performed. Re-uploading existing files or assigning ownership does not change original authorship. Keep a clear baseline and let each member implement, test and explain their subsequent contributions.
