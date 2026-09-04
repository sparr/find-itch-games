[find-itch-games](../README.md) / IItchLibraryRaw

# Interface: IItchLibraryRaw

Defined in: locations.ts:22

An install location, before its contents are looked at.

## Extended by

- [`IItchLibrary`](IItchLibrary.md)

## Properties

### id

```ts
id: string;
```

Defined in: locations.ts:24

itch's own id: a uuid, or the built-in `appdata`.

***

### path

```ts
path: string;
```

Defined in: locations.ts:25

***

### isDefault

```ts
isDefault: boolean;
```

Defined in: locations.ts:27

True for the location itch installs into by default.

***

### exists

```ts
exists: boolean;
```

Defined in: locations.ts:29

Whether the directory currently exists on disk.

***

### source

```ts
source: IItchLocationSource;
```

Defined in: locations.ts:30
