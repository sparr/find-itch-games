[find-itch-games](../README.md) / resolveDatabasePath

# Function: resolveDatabasePath()

```ts
function resolveDatabasePath(itchPath): Promise<string>;
```

Defined in: [src/itch.ts:127](https://github.com/sparr/find-itch-games/blob/main/src/itch.ts#L127)

Locates the butler database, allowing for the `butler-<host>.db` name that
builds configured against a non-standard itch.io host use.

## Parameters

### itchPath

`string`

An itch user-data directory.

## Returns

`Promise`\<`string`\>

The database path. Falls back to the default name when there is
  none on disk, so callers always have a path to report.
