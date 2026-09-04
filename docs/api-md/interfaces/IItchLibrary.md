[find-itch-games](../README.md) / IItchLibrary

# Interface: IItchLibrary

Defined in: src/index.ts:123

An install location together with the games in it.

## Extends

- [`IItchLibraryRaw`](IItchLibraryRaw.md)

## Properties

### apps

```ts
apps: IItchApp[];
```

Defined in: src/index.ts:124

***

### id

```ts
id: string;
```

Defined in: src/locations.ts:24

itch's own id: a uuid, or the built-in `appdata`.

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`id`](IItchLibraryRaw.md#id)

***

### path

```ts
path: string;
```

Defined in: src/locations.ts:25

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`path`](IItchLibraryRaw.md#path)

***

### isDefault

```ts
isDefault: boolean;
```

Defined in: src/locations.ts:27

True for the location itch installs into by default.

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`isDefault`](IItchLibraryRaw.md#isdefault)

***

### exists

```ts
exists: boolean;
```

Defined in: src/locations.ts:29

Whether the directory currently exists on disk.

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`exists`](IItchLibraryRaw.md#exists)

***

### source

```ts
source: IItchLocationSource;
```

Defined in: src/locations.ts:30

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`source`](IItchLibraryRaw.md#source)
