[find-itch-games](../README.md) / IItchLibrariesRaw

# Interface: IItchLibrariesRaw

Defined in: src/locations.ts:39

itch's install locations, with the state of the records they came from.

"Raw" because the locations have not been scanned for games yet -- see
[IItchLibraries](IItchLibraries.md) for that.

## Properties

### itchPath

```ts
itchPath: string;
```

Defined in: src/locations.ts:40

***

### databasePath

```ts
databasePath: string;
```

Defined in: src/locations.ts:41

***

### databaseAvailable

```ts
databaseAvailable: boolean;
```

Defined in: src/locations.ts:43

Whether butler.db was present and readable.

***

### libraries

```ts
libraries: IItchLibraryRaw[];
```

Defined in: src/locations.ts:44
