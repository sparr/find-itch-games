[find-itch-games](../README.md) / findItchAppById

# Function: findItchAppById()

```ts
function findItchAppById(gameId, options?): Promise<string>;
```

Defined in: [src/index.ts:463](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L463)

Finds where a game is installed, by itch.io game id.

## Parameters

### gameId

`number`

The itch.io game id.

### options?

[`IItchLookupOptions`](../interfaces/IItchLookupOptions.md) = `{}`

See [IItchLookupOptions](../interfaces/IItchLookupOptions.md).

## Returns

`Promise`\<`string`\>

Absolute path to the install folder.

## Throws

[AppNotFoundError](../classes/AppNotFoundError.md) if the game isn't installed.

## Throws

[AmbiguousAppError](../classes/AmbiguousAppError.md) if `strict` is set and it is installed twice.
