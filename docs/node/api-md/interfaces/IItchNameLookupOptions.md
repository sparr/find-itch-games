[find-itch-games](../README.md) / IItchNameLookupOptions

# Interface: IItchNameLookupOptions

Defined in: [src/index.ts:408](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L408)

Options for looking up a single game by name.

## Extends

- [`IItchLookupOptions`](IItchLookupOptions.md)

## Properties

### itchPath?

```ts
optional itchPath?: string;
```

Defined in: [src/index.ts:101](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L101)

Override the itch user-data directory instead of searching for it.

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`itchPath`](IItchLookupOptions.md#itchpath)

***

### strategy?

```ts
optional strategy?: "db" | "merge" | "receipts";
```

Defined in: [src/index.ts:103](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L103)

#### Default Value

```ts
"merge"
```

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`strategy`](IItchLookupOptions.md#strategy)

***

### checkExists?

```ts
optional checkExists?: boolean;
```

Defined in: [src/index.ts:110](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L110)

Drop games whose install folder is gone. itch leaves caves behind when a
folder is deleted outside the app, so this defaults to on.

#### Default Value

```ts
true
```

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`checkExists`](IItchLookupOptions.md#checkexists)

***

### extraLibraries?

```ts
optional extraLibraries?: readonly string[];
```

Defined in: [src/index.ts:112](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L112)

Extra install locations to scan, e.g. a drive itch was moved off.

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`extraLibraries`](IItchLookupOptions.md#extralibraries)

***

### ignoreDatabase?

```ts
optional ignoreDatabase?: boolean;
```

Defined in: [src/index.ts:120](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L120)

Don't touch butler.db at all, not even for install locations. Only
`preferences.json`, the built-in `appdata` location and `extraLibraries`
are used. Implies `strategy: "receipts"`.

#### Default Value

```ts
false
```

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`ignoreDatabase`](IItchLookupOptions.md#ignoredatabase)

***

### lookup?

```ts
optional lookup?: IItchPathLookup;
```

Defined in: [src/index.ts:125](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L125)

Search as though for a different user, environment or operating system.
Ignored when `itchPath` is given, which names the directory outright.

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`lookup`](IItchLookupOptions.md#lookup)

***

### strict?

```ts
optional strict?: boolean;
```

Defined in: [src/index.ts:404](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L404)

Throw [AmbiguousAppError](../classes/AmbiguousAppError.md) when more than one installed game matches,
instead of returning the first. The same game can legitimately be
installed in two locations, and a fuzzy name search can collide, so set
this when picking the wrong one would be worse than failing.

#### Default Value

```ts
false
```

#### Inherited from

[`IItchLookupOptions`](IItchLookupOptions.md).[`strict`](IItchLookupOptions.md#strict)

***

### exact?

```ts
optional exact?: boolean;
```

Defined in: [src/index.ts:420](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L420)

Require the name to equal the game's title, url slug or install folder
name exactly.

With `exact: false`, matching instead ignores case, spacing and
punctuation, so `"Cosmic Collapse"`, `"cosmic-collapse"` and
`"cosmiccollapse"` all resolve to the same game -- at the cost of
occasional collisions between similarly named games.

#### Default Value

```ts
true
```
