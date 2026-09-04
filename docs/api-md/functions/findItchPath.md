[find-itch-games](../README.md) / findItchPath

# Function: findItchPath()

```ts
function findItchPath(): Promise<string | undefined>;
```

Defined in: itch.ts:142

Searches for the itch app's user-data directory.

## Returns

`Promise`\<`string` \| `undefined`\>

Location of itch. `undefined` if itch wasn't found.
