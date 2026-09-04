[find-itch-games](../README.md) / IItchLegacyReceiptInfo

# Interface: IItchLegacyReceiptInfo

Defined in: receipt.ts:51

What the pre-v23 uncompressed `.itch/receipt.json` recorded.

Mirrors butler's `legacyReceipt`/`legacyCave` structs, which it still reads
when scanning install locations. There is no game title or url in this
format, only ids.

## Properties

### caveId?

```ts
optional caveId?: string;
```

Defined in: receipt.ts:52

***

### gameId

```ts
gameId: number;
```

Defined in: receipt.ts:53

***

### uploadId?

```ts
optional uploadId?: number;
```

Defined in: receipt.ts:54

***

### buildId?

```ts
optional buildId?: number;
```

Defined in: receipt.ts:55

***

### installLocation?

```ts
optional installLocation?: string;
```

Defined in: receipt.ts:57

Id of the install location, as the old client recorded it.

***

### installFolder?

```ts
optional installFolder?: string;
```

Defined in: receipt.ts:58

***

### pathScheme?

```ts
optional pathScheme?: number;
```

Defined in: receipt.ts:60

`2` is the only scheme butler will import.

***

### secondsRun?

```ts
optional secondsRun?: number;
```

Defined in: receipt.ts:61

***

### installedAt?

```ts
optional installedAt?: string | number;
```

Defined in: receipt.ts:63

A unix timestamp or an RFC3339 string, depending on the client version.

***

### lastTouched?

```ts
optional lastTouched?: number;
```

Defined in: receipt.ts:64
