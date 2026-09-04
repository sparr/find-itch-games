[find-itch-games](../README.md) / ItchNotFoundError

# Class: ItchNotFoundError

Defined in: errors.ts:8

Thrown when the itch app's user-data directory can't be located.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new ItchNotFoundError(searched?): ItchNotFoundError;
```

Defined in: errors.ts:11

#### Parameters

##### searched?

readonly `string`[]

#### Returns

`ItchNotFoundError`

#### Overrides

```ts
Error.constructor
```

## Properties

### name

```ts
readonly name: "ItchNotFoundError" = "ItchNotFoundError";
```

Defined in: errors.ts:9

#### Overrides

```ts
Error.name
```
