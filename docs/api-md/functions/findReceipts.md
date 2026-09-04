[find-itch-games](../README.md) / findReceipts

# Function: findReceipts()

```ts
function findReceipts(libraryPath): Promise<IFoundReceipt[]>;
```

Defined in: receipt.ts:218

Scans the immediate subdirectories of an install location for receipts.

This follows the same rules as butler's own install-location scan: skip the
`downloads` staging folder, require a `.itch` directory, then read the
receipt. It is the on-disk source of truth -- it finds games butler.db has
forgotten, and it ignores unrelated folders, which matters because an
install location is often a directory the user keeps other things in.

## Parameters

### libraryPath

`string`

An install location's path.

## Returns

`Promise`\<[`IFoundReceipt`](../interfaces/IFoundReceipt.md)[]\>
