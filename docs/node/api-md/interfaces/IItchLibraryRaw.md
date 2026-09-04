[find-itch-games](../README.md) / IItchLibraryRaw

# Interface: IItchLibraryRaw

Defined in: [src/locations.ts:22](https://github.com/sparr/find-itch-games/blob/main/node/src/locations.ts#L22)

An install location, before its contents are looked at.

## Extended by

- [`IItchLibrary`](IItchLibrary.md)

## Properties

### id

```ts
id: string;
```

Defined in: [src/locations.ts:24](https://github.com/sparr/find-itch-games/blob/main/node/src/locations.ts#L24)

itch's own id: a uuid, or the built-in `appdata`.

***

### path

```ts
path: string;
```

Defined in: [src/locations.ts:25](https://github.com/sparr/find-itch-games/blob/main/node/src/locations.ts#L25)

***

### isDefault

```ts
isDefault: boolean;
```

Defined in: [src/locations.ts:27](https://github.com/sparr/find-itch-games/blob/main/node/src/locations.ts#L27)

True for the location itch installs into by default.

***

### exists

```ts
exists: boolean;
```

Defined in: [src/locations.ts:29](https://github.com/sparr/find-itch-games/blob/main/node/src/locations.ts#L29)

Whether the directory currently exists on disk.

***

### source

```ts
source: IItchLocationSource;
```

Defined in: [src/locations.ts:30](https://github.com/sparr/find-itch-games/blob/main/node/src/locations.ts#L30)
