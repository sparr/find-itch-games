[find-itch-games](../README.md) / IItchInstallLocationRow

# Interface: IItchInstallLocationRow

Defined in: [src/db.ts:27](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L27)

An install location as butler.db records it.

## Properties

### id

```ts
id: string;
```

Defined in: [src/db.ts:29](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L29)

`appdata` for the built-in location, otherwise a uuid.

***

### path

```ts
path: string;
```

Defined in: [src/db.ts:31](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L31)

Absolute path of the directory games are installed into.
