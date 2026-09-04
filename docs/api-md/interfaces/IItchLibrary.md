[find-itch-games](../README.md) / IItchLibrary

# Interface: IItchLibrary

Defined in: [src/index.ts:133](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L133)

An install location together with the games in it.

## Extends

- [`IItchLibraryRaw`](IItchLibraryRaw.md)

## Properties

### apps

```ts
apps: IItchApp[];
```

Defined in: [src/index.ts:134](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L134)

***

### id

```ts
id: string;
```

Defined in: [src/locations.ts:24](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L24)

itch's own id: a uuid, or the built-in `appdata`.

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`id`](IItchLibraryRaw.md#id)

***

### path

```ts
path: string;
```

Defined in: [src/locations.ts:25](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L25)

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`path`](IItchLibraryRaw.md#path)

***

### isDefault

```ts
isDefault: boolean;
```

Defined in: [src/locations.ts:27](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L27)

True for the location itch installs into by default.

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`isDefault`](IItchLibraryRaw.md#isdefault)

***

### exists

```ts
exists: boolean;
```

Defined in: [src/locations.ts:29](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L29)

Whether the directory currently exists on disk.

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`exists`](IItchLibraryRaw.md#exists)

***

### source

```ts
source: IItchLocationSource;
```

Defined in: [src/locations.ts:30](https://github.com/sparr/find-itch-games/blob/main/src/locations.ts#L30)

#### Inherited from

[`IItchLibraryRaw`](IItchLibraryRaw.md).[`source`](IItchLibraryRaw.md#source)
