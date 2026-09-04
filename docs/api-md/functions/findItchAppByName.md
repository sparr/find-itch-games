[find-itch-games](../README.md) / findItchAppByName

# Function: findItchAppByName()

```ts
function findItchAppByName(name, options?): Promise<string>;
```

Defined in: [src/index.ts:503](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L503)

Finds where a game is installed, by title, url slug or install folder name.

## Parameters

### name

`string`

A title, url slug or install folder name.

### options?

[`IItchNameLookupOptions`](../interfaces/IItchNameLookupOptions.md) = `{}`

See [IItchNameLookupOptions](../interfaces/IItchNameLookupOptions.md).

## Returns

`Promise`\<`string`\>

Absolute path to the install folder.

## Throws

[AppNotFoundError](../classes/AppNotFoundError.md) if no installed game matches.

## Throws

[AmbiguousAppError](../classes/AmbiguousAppError.md) if `strict` is set and several match.
