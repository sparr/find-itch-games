[find-itch-games](../README.md) / IItchLibraryRaw

# Interface: IItchLibraryRaw

Defined in: src/locations.ts:22

An install location, before its contents are looked at.

## Extended by

- [`IItchLibrary`](IItchLibrary.md)

## Properties

### id

```ts
id: string;
```

Defined in: src/locations.ts:24

itch's own id: a uuid, or the built-in `appdata`.

***

### path

```ts
path: string;
```

Defined in: src/locations.ts:25

***

### isDefault

```ts
isDefault: boolean;
```

Defined in: src/locations.ts:27

True for the location itch installs into by default.

***

### exists

```ts
exists: boolean;
```

Defined in: src/locations.ts:29

Whether the directory currently exists on disk.

***

### source

```ts
source: IItchLocationSource;
```

Defined in: src/locations.ts:30
