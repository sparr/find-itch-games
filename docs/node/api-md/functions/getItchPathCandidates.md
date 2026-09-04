[find-itch-games](../README.md) / getItchPathCandidates

# Function: getItchPathCandidates()

```ts
function getItchPathCandidates(lookup?): string[];
```

Defined in: [src/itch.ts:70](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L70)

Directories the itch app may keep its user data in, most specific first.

This mirrors Electron's `app.getPath("userData")` for each app variant, so
it follows the same platform conventions.

`ITCH_USER_DATA_DIR` and `ITCH_APP_DIR` are this library's own escape hatch
for unusual installs -- the itch app itself does not read them.

## Parameters

### lookup?

[`IItchPathLookup`](../interfaces/IItchPathLookup.md) = `{}`

See [IItchPathLookup](../interfaces/IItchPathLookup.md). Defaults to the current user.

## Returns

`string`[]
