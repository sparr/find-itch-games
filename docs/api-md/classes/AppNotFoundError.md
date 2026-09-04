[find-itch-games](../README.md) / AppNotFoundError

# Class: AppNotFoundError

Defined in: [src/errors.ts:21](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L21)

Thrown when a game is installed nowhere itch knows about.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new AppNotFoundError(query): AppNotFoundError;
```

Defined in: [src/errors.ts:24](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L24)

#### Parameters

##### query

`string` \| `number`

#### Returns

`AppNotFoundError`

#### Overrides

```ts
Error.constructor
```

## Properties

### name

```ts
readonly name: "AppNotFoundError" = "AppNotFoundError";
```

Defined in: [src/errors.ts:22](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L22)

#### Overrides

```ts
Error.name
```

***

### query

```ts
readonly query: string | number;
```

Defined in: [src/errors.ts:24](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L24)
