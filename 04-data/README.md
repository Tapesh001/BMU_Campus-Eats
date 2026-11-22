# Data storage

MongoDB stores application data in the `app_state` collection. The default database is `campus_eats`. The document layout is compatible with earlier Atlas deployments.

| Document ID | Contents of the value field |
| --- | --- |
| students | Accounts, profile details, password salts and hashes |
| commerce | Orders, favourites, addresses and offers |
| catalog | Menus, stock and shop availability |

An empty database starts with empty accounts and orders. The public menu in [menu-data.json](menu-data.json) supplies initial catalogue data. Administrator edits are saved to MongoDB. Each document carries a revision to prevent overwriting another writer's update.

Earlier installations using local JSON may have records in the previous `BMU_DATA_DIR` or `~/.bmu-campus-eats`. Those records require a one-time migration if you want to carry them forward. Before first startup against a fresh database, back up the files and import their JSON values as the corresponding documents above, each shaped as `{ _id, revision: 0, value }`. Preserve student and order IDs, password salts and hashes. For a database already in use, reconcile the existing records before importing.

For an empty Atlas database, run the following once before starting the server. Set the target connection in the private environment first. The import uses a MongoDB transaction (Atlas or a replica set), refuses a populated target, and leaves the original files in place.

```powershell
node 03-backend/import-legacy.js "$env:USERPROFILE\.bmu-campus-eats"
```
