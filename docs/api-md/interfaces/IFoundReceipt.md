[find-itch-games](../README.md) / IFoundReceipt

# Interface: IFoundReceipt

Defined in: src/receipt.ts:199

A receipt found by scanning an install location, with where it was found.

## Properties

### path

```ts
path: string;
```

Defined in: src/receipt.ts:201

Absolute path to the install folder.

***

### installFolderName

```ts
installFolderName: string;
```

Defined in: src/receipt.ts:203

The folder's own name, which is itch's `installFolderName`.

***

### receipt

```ts
receipt: IItchReceipt;
```

Defined in: src/receipt.ts:204
