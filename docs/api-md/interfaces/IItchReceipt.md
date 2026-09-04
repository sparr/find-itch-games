[find-itch-games](../README.md) / IItchReceipt

# Interface: IItchReceipt

Defined in: [src/receipt.ts:26](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L26)

itch writes one of these into every folder it installs a game into.

Mirrors `bfs.Receipt` in `github.com/itchio/hush`.

## Properties

### game

```ts
game: IItchGame;
```

Defined in: [src/receipt.ts:28](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L28)

The itch.io game installed at this location.

***

### upload?

```ts
optional upload?: IItchUpload;
```

Defined in: [src/receipt.ts:30](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L30)

The itch.io upload installed at this location.

***

### build?

```ts
optional build?: IItchBuild;
```

Defined in: [src/receipt.ts:32](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L32)

The itch.io build installed here. Absent for non-wharf uploads.

***

### files?

```ts
optional files?: string[];
```

Defined in: [src/receipt.ts:34](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L34)

Installed files, as slash-separated paths relative to the folder.

***

### installerName?

```ts
optional installerName?: string;
```

Defined in: [src/receipt.ts:36](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L36)

The installer used, e.g. `archive`, `msi`, `inno`.

***

### legacy?

```ts
optional legacy?: IItchLegacyReceiptInfo;
```

Defined in: [src/receipt.ts:41](https://github.com/sparr/find-itch-games/blob/main/src/receipt.ts#L41)

Set when the receipt came from the pre-v23 `.itch/receipt.json` format,
which recorded ids but no game metadata.
