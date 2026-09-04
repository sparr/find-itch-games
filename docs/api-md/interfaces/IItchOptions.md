[find-itch-games](../README.md) / IItchOptions

# Interface: IItchOptions

Defined in: [src/index.ts:88](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L88)

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

Defined in: [src/index.ts:90](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L90)

Override the itch user-data directory instead of searching for it.

***

### strategy?

```ts
optional strategy?: "db" | "merge" | "receipts";
```

Defined in: [src/index.ts:92](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L92)

#### Default Value

```ts
"merge"
```

***

### checkExists?

```ts
optional checkExists?: boolean;
```

Defined in: [src/index.ts:99](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L99)

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

Defined in: [src/index.ts:101](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L101)

Extra install locations to scan, e.g. a drive itch was moved off.

***

### ignoreDatabase?

```ts
optional ignoreDatabase?: boolean;
```

Defined in: [src/index.ts:109](https://github.com/sparr/find-itch-games/blob/main/src/index.ts#L109)

Don't touch butler.db at all, not even for install locations. Only
`preferences.json`, the built-in `appdata` location and `extraLibraries`
are used. Implies `strategy: "receipts"`.

#### Default Value

```ts
false
```
