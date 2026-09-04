[find-itch-games](../README.md) / getInstallFolderPath

# Function: getInstallFolderPath()

```ts
function getInstallFolderPath(libraryPath, installFolderName): string;
```

Defined in: src/locations.ts:76

Where a game with the given install folder name lives inside a location.

itch installs games directly into the location -- there is no equivalent of
Steam's `steamapps/common` nesting -- so this is a plain join.

## Parameters

### libraryPath

`string`

An install location's path.

### installFolderName

`string`

The game's install folder name.

## Returns

`string`
