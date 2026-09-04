[find-itch-games](../README.md) / getAppdataInstallLocation

# Function: getAppdataInstallLocation()

```ts
function getAppdataInstallLocation(itchPath): string;
```

Defined in: [src/itch.ts:160](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L160)

The built-in `appdata` install location, which itch derives from its own
user-data directory rather than storing as a path.

## Parameters

### itchPath

`string`

An itch user-data directory.

## Returns

`string`
