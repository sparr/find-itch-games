[find-itch-games](../README.md) / AppNotFoundError

# Class: AppNotFoundError

Defined in: errors.ts:21

Thrown when a game is installed nowhere itch knows about.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new AppNotFoundError(query): AppNotFoundError;
```

Defined in: errors.ts:24

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

Defined in: errors.ts:22

#### Overrides

```ts
Error.name
```

***

### query

```ts
readonly query: string | number;
```

Defined in: errors.ts:24
