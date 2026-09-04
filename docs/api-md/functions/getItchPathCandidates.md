[find-itch-games](../README.md) / getItchPathCandidates

# Function: getItchPathCandidates()

```ts
function getItchPathCandidates(): string[];
```

Defined in: itch.ts:36

Directories the itch app may keep its user data in, most specific first.

This mirrors Electron's `app.getPath("userData")` for each app variant, so
it follows the same platform conventions.

`ITCH_USER_DATA_DIR` and `ITCH_APP_DIR` are this library's own escape hatch
for unusual installs -- the itch app itself does not read them.

## Returns

`string`[]
