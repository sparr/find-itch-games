[find-itch-games](../README.md) / IItchOptions

# Interface: IItchOptions

Defined in: [src/index.ts:99](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L99)

Options shared by every lookup in this library.

They control where itch is looked for and which of its records are trusted;
the defaults suit a normal installation, so most callers pass nothing.

## Extended by

- [`IItchLookupOptions`](IItchLookupOptions.md)

## Properties

### itchPath?

```ts
optional itchPath?: string;
```

Defined in: [src/index.ts:101](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L101)

Override the itch user-data directory instead of searching for it.

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

***

### extraLibraries?

```ts
optional extraLibraries?: readonly string[];
```

Defined in: [src/index.ts:112](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L112)

Extra install locations to scan, e.g. a drive itch was moved off.

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

***

### lookup?

```ts
optional lookup?: IItchPathLookup;
```

Defined in: [src/index.ts:125](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L125)

Search as though for a different user, environment or operating system.
Ignored when `itchPath` is given, which names the directory outright.
