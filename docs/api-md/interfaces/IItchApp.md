[find-itch-games](../README.md) / IItchApp

# Interface: IItchApp

Defined in: src/index.ts:113

One installed game inside a library.

## Properties

### gameId

```ts
gameId: number;
```

Defined in: src/index.ts:114

***

### path

```ts
path: string;
```

Defined in: src/index.ts:116

Absolute path to the installed game.

***

### receiptPath?

```ts
optional receiptPath?: string;
```

Defined in: src/index.ts:118

Absolute path to the on-disk receipt, when there is one.

***

### manifest

```ts
manifest: IItchAppManifest;
```

Defined in: src/index.ts:119
