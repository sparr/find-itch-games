[find-itch-games](../README.md) / ItchDatabaseError

# Class: ItchDatabaseError

Defined in: errors.ts:30

Thrown when butler.db exists but can't be opened or read.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new ItchDatabaseError(databasePath, cause): ItchDatabaseError;
```

Defined in: errors.ts:33

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

Defined in: errors.ts:31

#### Overrides

```ts
Error.name
```

***

### databasePath

```ts
readonly databasePath: string;
```

Defined in: errors.ts:34

***

### cause

```ts
readonly cause: unknown;
```

Defined in: errors.ts:35

#### Inherited from

```ts
Error.cause
```
