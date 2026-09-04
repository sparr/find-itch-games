[find-itch-games](../README.md) / IItchUpload

# Interface: IItchUpload

Defined in: [src/types.ts:101](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L101)

The specific file/channel that was installed.

## Properties

### id

```ts
id: number;
```

Defined in: [src/types.ts:102](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L102)

***

### storage?

```ts
optional storage?: IItchUploadStorage;
```

Defined in: [src/types.ts:103](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L103)

***

### host?

```ts
optional host?: string;
```

Defined in: [src/types.ts:105](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L105)

Only set for `external` storage.

***

### filename?

```ts
optional filename?: string;
```

Defined in: [src/types.ts:107](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L107)

Original file name, e.g. `Overland_x64.zip`.

***

### displayName?

```ts
optional displayName?: string;
```

Defined in: [src/types.ts:109](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L109)

Name set by the developer, e.g. `Overland for Windows 64-bit`.

***

### size?

```ts
optional size?: number;
```

Defined in: [src/types.ts:111](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L111)

Size in bytes; for wharf uploads this is the archive size.

***

### channelName?

```ts
optional channelName?: string;
```

Defined in: [src/types.ts:113](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L113)

Set only for wharf (butler-pushed) uploads.

***

### buildId?

```ts
optional buildId?: number;
```

Defined in: [src/types.ts:114](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L114)

***

### build?

```ts
optional build?: IItchBuild;
```

Defined in: [src/types.ts:115](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L115)

***

### type?

```ts
optional type?: IItchUploadType;
```

Defined in: [src/types.ts:116](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L116)

***

### preorder?

```ts
optional preorder?: boolean;
```

Defined in: [src/types.ts:117](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L117)

***

### demo?

```ts
optional demo?: boolean;
```

Defined in: [src/types.ts:118](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L118)

***

### platforms?

```ts
optional platforms?: IItchPlatforms;
```

Defined in: [src/types.ts:119](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L119)

***

### createdAt?

```ts
optional createdAt?: string;
```

Defined in: [src/types.ts:120](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L120)

***

### updatedAt?

```ts
optional updatedAt?: string;
```

Defined in: [src/types.ts:121](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L121)
