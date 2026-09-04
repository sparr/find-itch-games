[find-itch-games](../README.md) / findItchPath

# Function: findItchPath()

```ts
function findItchPath(lookup?): Promise<string | undefined>;
```

Defined in: [src/itch.ts:179](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L179)

Searches for the itch app's user-data directory.

## Parameters

### lookup?

[`IItchPathLookup`](../interfaces/IItchPathLookup.md) = `{}`

See [IItchPathLookup](../interfaces/IItchPathLookup.md). Defaults to the current user.

## Returns

`Promise`\<`string` \| `undefined`\>

Location of itch. `undefined` if itch wasn't found.
