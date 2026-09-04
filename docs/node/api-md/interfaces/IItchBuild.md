[find-itch-games](../README.md) / IItchBuild

# Interface: IItchBuild

Defined in: [src/types.ts:125](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L125)

Present only for wharf (`storage: "build"`) uploads.

## Properties

### id

```ts
id: number;
```

Defined in: [src/types.ts:126](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L126)

***

### parentBuildId?

```ts
optional parentBuildId?: number;
```

Defined in: [src/types.ts:127](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L127)

***

### state?

```ts
optional state?: OpenEnum<"started" | "processing" | "completed" | "failed">;
```

Defined in: [src/types.ts:128](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L128)

***

### version?

```ts
optional version?: number;
```

Defined in: [src/types.ts:130](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L130)

Monotonic build number assigned by itch.io.

***

### userVersion?

```ts
optional userVersion?: string;
```

Defined in: [src/types.ts:132](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L132)

The developer's own version string, e.g. `1.6.0`.

***

### uploadId?

```ts
optional uploadId?: number;
```

Defined in: [src/types.ts:133](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L133)

***

### gameId?

```ts
optional gameId?: number;
```

Defined in: [src/types.ts:134](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L134)

***

### userId?

```ts
optional userId?: number;
```

Defined in: [src/types.ts:135](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L135)

***

### createdAt?

```ts
optional createdAt?: string;
```

Defined in: [src/types.ts:136](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L136)

***

### updatedAt?

```ts
optional updatedAt?: string;
```

Defined in: [src/types.ts:137](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L137)
