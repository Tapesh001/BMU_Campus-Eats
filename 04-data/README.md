# 04 · Data

[menu-data.json](menu-data.json) is the starting menu catalog, transcribed from the supplied shop menus. The server reads it when no administrator-edited private catalog exists.

## Runtime data

Submissions are stored outside the repository, by default in `.bmu-campus-eats` in the operating-system user's home directory. Set `BMU_DATA_DIR` to change that location.

| Private file | Contents |
| :--- | :--- |
| `students.json` | Registration/profile submissions and salted password hashes |
| `commerce.json` | Orders, favourites, addresses and offers |
| `catalog.json` | Catalog overrides saved through administration |

Do not commit these runtime files. They are not served as public assets. An existing `catalog.json` takes precedence over seed changes; update it through administration, or deliberately back up and reset your own test catalog when testing a fresh seed.
