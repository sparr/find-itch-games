[find-itch-games](../README.md) / IItchVerdict

# Interface: IItchVerdict

Defined in: [src/types.ts:221](https://github.com/sparr/find-itch-games/blob/main/src/types.ts#L221)

Butler's scan of an install folder, stored on the cave.

## Properties

### basePath?

```ts
optional basePath?: string;
```

Defined in: [src/types.ts:223](https://github.com/sparr/find-itch-games/blob/main/src/types.ts#L223)

Absolute path of the folder that was configured.

***

### totalSize?

```ts
optional totalSize?: number;
```

Defined in: [src/types.ts:225](https://github.com/sparr/find-itch-games/blob/main/src/types.ts#L225)

Size in bytes of the folder and everything under it.

***

### candidates?

```ts
optional candidates?: IItchLaunchCandidate[] | null;
```

Defined in: [src/types.ts:226](https://github.com/sparr/find-itch-games/blob/main/src/types.ts#L226)
