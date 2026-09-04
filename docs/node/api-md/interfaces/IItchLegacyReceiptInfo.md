[find-itch-games](../README.md) / IItchLegacyReceiptInfo

# Interface: IItchLegacyReceiptInfo

Defined in: [src/receipt.ts:51](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L51)

What the pre-v23 uncompressed `.itch/receipt.json` recorded.

Mirrors butler's `legacyReceipt`/`legacyCave` structs, which it still reads
when scanning install locations. There is no game title or url in this
format, only ids.

## Properties

### caveId?

```ts
optional caveId?: string;
```

Defined in: [src/receipt.ts:52](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L52)

***

### gameId

```ts
gameId: number;
```

Defined in: [src/receipt.ts:53](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L53)

***

### uploadId?

```ts
optional uploadId?: number;
```

Defined in: [src/receipt.ts:54](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L54)

***

### buildId?

```ts
optional buildId?: number;
```

Defined in: [src/receipt.ts:55](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L55)

***

### installLocation?

```ts
optional installLocation?: string;
```

Defined in: [src/receipt.ts:57](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L57)

Id of the install location, as the old client recorded it.

***

### installFolder?

```ts
optional installFolder?: string;
```

Defined in: [src/receipt.ts:58](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L58)

***

### pathScheme?

```ts
optional pathScheme?: number;
```

Defined in: [src/receipt.ts:60](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L60)

`2` is the only scheme butler will import.

***

### secondsRun?

```ts
optional secondsRun?: number;
```

Defined in: [src/receipt.ts:61](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L61)

***

### installedAt?

```ts
optional installedAt?: string | number;
```

Defined in: [src/receipt.ts:63](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L63)

A unix timestamp or an RFC3339 string, depending on the client version.

***

### lastTouched?

```ts
optional lastTouched?: number;
```

Defined in: [src/receipt.ts:64](https://github.com/sparr/find-itch-games/blob/main/node/src/receipt.ts#L64)
