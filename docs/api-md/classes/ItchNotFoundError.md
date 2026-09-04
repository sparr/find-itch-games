[find-itch-games](../README.md) / ItchNotFoundError

# Class: ItchNotFoundError

Defined in: [src/errors.ts:8](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L8)

Thrown when the itch app's user-data directory can't be located.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new ItchNotFoundError(searched?): ItchNotFoundError;
```

Defined in: [src/errors.ts:11](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L11)

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

Defined in: [src/errors.ts:9](https://github.com/sparr/find-itch-games/blob/main/src/errors.ts#L9)

#### Overrides

```ts
Error.name
```
