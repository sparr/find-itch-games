[find-itch-games](../README.md) / IItchApp

# Interface: IItchApp

Defined in: [src/index.ts:113](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L113)

One installed game inside a library.

## Properties

### gameId

```ts
gameId: number;
```

Defined in: [src/index.ts:114](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L114)

***

### path

```ts
path: string;
```

Defined in: [src/index.ts:116](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L116)

Absolute path to the installed game.

***

### receiptPath?

```ts
optional receiptPath?: string;
```

Defined in: [src/index.ts:118](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L118)

Absolute path to the on-disk receipt, when there is one.

***

### manifest

```ts
manifest: IItchAppManifest;
```

Defined in: [src/index.ts:119](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L119)
