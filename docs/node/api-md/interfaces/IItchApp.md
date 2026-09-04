[find-itch-games](../README.md) / IItchApp

# Interface: IItchApp

Defined in: [src/index.ts:129](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L129)

One installed game inside a library.

## Properties

### gameId

```ts
gameId: number;
```

Defined in: [src/index.ts:130](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L130)

***

### path

```ts
path: string;
```

Defined in: [src/index.ts:132](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L132)

Absolute path to the installed game.

***

### receiptPath?

```ts
optional receiptPath?: string;
```

Defined in: [src/index.ts:134](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L134)

Absolute path to the on-disk receipt, when there is one.

***

### manifest

```ts
manifest: IItchAppManifest;
```

Defined in: [src/index.ts:135](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L135)
