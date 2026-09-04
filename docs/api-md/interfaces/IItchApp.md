[find-itch-games](../README.md) / IItchApp

# Interface: IItchApp

Defined in: [src/index.ts:123](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L123)

One installed game inside a library.

## Properties

### gameId

```ts
gameId: number;
```

Defined in: [src/index.ts:124](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L124)

***

### path

```ts
path: string;
```

Defined in: [src/index.ts:126](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L126)

Absolute path to the installed game.

***

### receiptPath?

```ts
optional receiptPath?: string;
```

Defined in: [src/index.ts:128](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L128)

Absolute path to the on-disk receipt, when there is one.

***

### manifest

```ts
manifest: IItchAppManifest;
```

Defined in: [src/index.ts:129](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L129)
