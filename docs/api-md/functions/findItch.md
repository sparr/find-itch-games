[find-itch-games](../README.md) / findItch

# Function: findItch()

```ts
function findItch(options?): Promise<IItchLibraries>;
```

Defined in: [src/index.ts:166](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L166)

Finds itch, its install locations and every game installed in them.

## Parameters

### options?

[`IItchOptions`](../interfaces/IItchOptions.md) = `{}`

See [IItchOptions](../interfaces/IItchOptions.md).

## Returns

`Promise`\<[`IItchLibraries`](../interfaces/IItchLibraries.md)\>

## Throws

[ItchNotFoundError](../classes/ItchNotFoundError.md) if the itch user-data directory can't be found.

## Throws

A `TypeError` if `strategy` isn't one of [ITCH\_STRATEGIES](../variables/ITCH_STRATEGIES.md).
