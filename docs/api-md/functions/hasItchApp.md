[find-itch-games](../README.md) / hasItchApp

# Function: hasItchApp()

```ts
function hasItchApp(game, options?): Promise<boolean>;
```

Defined in: src/index.ts:500

Whether a game is currently installed, by game id or by name.

## Parameters

### game

`string` \| `number`

An itch.io game id, or a title, url slug or install folder name.

### options?

[`IItchNameLookupOptions`](../interfaces/IItchNameLookupOptions.md)

See [IItchNameLookupOptions](../interfaces/IItchNameLookupOptions.md).

## Returns

`Promise`\<`boolean`\>
