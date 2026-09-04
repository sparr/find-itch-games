[find-itch-games](../README.md) / findItchAppsById

# Function: findItchAppsById()

```ts
function findItchAppsById(gameId, options?): Promise<IItchApp[]>;
```

Defined in: [src/index.ts:446](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L446)

Every install of a game, by itch.io game id.

Usually zero or one, but itch will happily install the same game into more
than one location.

## Parameters

### gameId

`number`

The itch.io game id.

### options?

[`IItchOptions`](../interfaces/IItchOptions.md)

See [IItchOptions](../interfaces/IItchOptions.md).

## Returns

`Promise`\<[`IItchApp`](../interfaces/IItchApp.md)[]\>
