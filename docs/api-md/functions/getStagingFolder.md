[find-itch-games](../README.md) / getStagingFolder

# Function: getStagingFolder()

```ts
function getStagingFolder(libraryPath, downloadId): string;
```

Defined in: src/locations.ts:63

Where an in-progress download is staged, matching butler's
`InstallLocation.GetStagingFolder`.

## Parameters

### libraryPath

`string`

An install location's path.

### downloadId

`string`

itch's id for the in-progress download.

## Returns

`string`
