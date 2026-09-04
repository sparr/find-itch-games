[find-itch-games](../README.md) / AmbiguousAppError

# Class: AmbiguousAppError

Defined in: [src/errors.ts:51](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L51)

Thrown when a lookup matches more than one installed game.

Only raised when `strict` is set; otherwise the first match wins. Use
`findItchAppsByName` / `findItchAppsById` to see every match.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new AmbiguousAppError(query, paths): AmbiguousAppError;
```

Defined in: [src/errors.ts:54](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L54)

#### Parameters

##### query

`string` \| `number`

##### paths

readonly `string`[]

#### Returns

`AmbiguousAppError`

#### Overrides

```ts
Error.constructor
```

## Properties

### name

```ts
readonly name: "AmbiguousAppError" = "AmbiguousAppError";
```

Defined in: [src/errors.ts:52](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L52)

#### Overrides

```ts
Error.name
```

***

### query

```ts
readonly query: string | number;
```

Defined in: [src/errors.ts:55](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L55)

***

### paths

```ts
readonly paths: readonly string[];
```

Defined in: [src/errors.ts:56](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L56)
