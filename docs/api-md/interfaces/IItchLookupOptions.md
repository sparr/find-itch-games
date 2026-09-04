[find-itch-games](../README.md) / IItchLookupOptions

# Interface: IItchLookupOptions

Defined in: [src/index.ts:389](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L389)

Options for looking up a single game.

## Extends

- [`IItchOptions`](IItchOptions.md)

## Extended by

- [`IItchNameLookupOptions`](IItchNameLookupOptions.md)

## Properties

### itchPath?

```ts
optional itchPath?: string;
```

Defined in: [src/index.ts:100](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L100)

Override the itch user-data directory instead of searching for it.

#### Inherited from

[`IItchOptions`](IItchOptions.md).[`itchPath`](IItchOptions.md#itchpath)

***

### strategy?

```ts
optional strategy?: "db" | "merge" | "receipts";
```

Defined in: [src/index.ts:102](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L102)

#### Default Value

```ts
"merge"
```

#### Inherited from

[`IItchOptions`](IItchOptions.md).[`strategy`](IItchOptions.md#strategy)

***

### checkExists?

```ts
optional checkExists?: boolean;
```

Defined in: [src/index.ts:109](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L109)

Drop games whose install folder is gone. itch leaves caves behind when a
folder is deleted outside the app, so this defaults to on.

#### Default Value

```ts
true
```

#### Inherited from

[`IItchOptions`](IItchOptions.md).[`checkExists`](IItchOptions.md#checkexists)

***

### extraLibraries?

```ts
optional extraLibraries?: readonly string[];
```

Defined in: [src/index.ts:111](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L111)

Extra install locations to scan, e.g. a drive itch was moved off.

#### Inherited from

[`IItchOptions`](IItchOptions.md).[`extraLibraries`](IItchOptions.md#extralibraries)

***

### ignoreDatabase?

```ts
optional ignoreDatabase?: boolean;
```

Defined in: [src/index.ts:119](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L119)

Don't touch butler.db at all, not even for install locations. Only
`preferences.json`, the built-in `appdata` location and `extraLibraries`
are used. Implies `strategy: "receipts"`.

#### Default Value

```ts
false
```

#### Inherited from

[`IItchOptions`](IItchOptions.md).[`ignoreDatabase`](IItchOptions.md#ignoredatabase)

***

### strict?

```ts
optional strict?: boolean;
```

Defined in: [src/index.ts:398](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L398)

Throw [AmbiguousAppError](../classes/AmbiguousAppError.md) when more than one installed game matches,
instead of returning the first. The same game can legitimately be
installed in two locations, and a fuzzy name search can collide, so set
this when picking the wrong one would be worse than failing.

#### Default Value

```ts
false
```
