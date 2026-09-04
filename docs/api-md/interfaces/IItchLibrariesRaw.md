[find-itch-games](../README.md) / IItchLibrariesRaw

# Interface: IItchLibrariesRaw

Defined in: [src/locations.ts:39](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L39)

itch's install locations, with the state of the records they came from.

"Raw" because the locations have not been scanned for games yet -- see
[IItchLibraries](IItchLibraries.md) for that.

## Properties

### itchPath

```ts
itchPath: string;
```

Defined in: [src/locations.ts:40](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L40)

***

### databasePath

```ts
databasePath: string;
```

Defined in: [src/locations.ts:41](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L41)

***

### databaseAvailable

```ts
databaseAvailable: boolean;
```

Defined in: [src/locations.ts:43](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L43)

Whether butler.db was present and readable.

***

### libraries

```ts
libraries: IItchLibraryRaw[];
```

Defined in: [src/locations.ts:44](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L44)
