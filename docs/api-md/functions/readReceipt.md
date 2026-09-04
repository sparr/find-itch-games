[find-itch-games](../README.md) / readReceipt

# Function: readReceipt()

```ts
function readReceipt(installPath): Promise<IItchReceipt | null>;
```

Defined in: receipt.ts:122

Reads the receipt itch left inside an install folder.

Falls back to the pre-v23 `receipt.json` format, which is normalized into
the same shape with the ids it carries under `legacy`.

## Parameters

### installPath

`string`

A game's install folder.

## Returns

`Promise`\<[`IItchReceipt`](../interfaces/IItchReceipt.md) \| `null`\>

The receipt, or `null` if the folder has none.
