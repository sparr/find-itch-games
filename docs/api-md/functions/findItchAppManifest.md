[find-itch-games](../README.md) / findItchAppManifest

# Function: findItchAppManifest()

```ts
function findItchAppManifest(gameId, options?): Promise<IItchAppManifest | null>;
```

Defined in: index.ts:370

Reads the merged cave/receipt record for a game.

## Parameters

### gameId

`number`

The itch.io game id.

### options?

[`IItchOptions`](../interfaces/IItchOptions.md)

See [IItchOptions](../interfaces/IItchOptions.md).

## Returns

`Promise`\<[`IItchAppManifest`](../interfaces/IItchAppManifest.md) \| `null`\>

The manifest, or `null` if the game isn't installed.
