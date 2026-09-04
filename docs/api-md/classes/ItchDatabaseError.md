[find-itch-games](../README.md) / ItchDatabaseError

# Class: ItchDatabaseError

Defined in: [src/errors.ts:30](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L30)

Thrown when butler.db exists but can't be opened or read.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new ItchDatabaseError(databasePath, cause): ItchDatabaseError;
```

Defined in: [src/errors.ts:33](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L33)

#### Parameters

##### databasePath

`string`

##### cause

`unknown`

#### Returns

`ItchDatabaseError`

#### Overrides

```ts
Error.constructor
```

## Properties

### name

```ts
readonly name: "ItchDatabaseError" = "ItchDatabaseError";
```

Defined in: [src/errors.ts:31](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L31)

#### Overrides

```ts
Error.name
```

***

### databasePath

```ts
readonly databasePath: string;
```

Defined in: [src/errors.ts:34](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L34)

***

### cause

```ts
readonly cause: unknown;
```

Defined in: [src/errors.ts:35](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L35)

#### Inherited from

```ts
Error.cause
```
