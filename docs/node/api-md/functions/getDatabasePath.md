[find-itch-games](../README.md) / getDatabasePath

# Function: getDatabasePath()

```ts
function getDatabasePath(itchPath): string;
```

Defined in: [src/itch.ts:115](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L115)

The default butler database inside an itch user-data directory.

Builds pointed at a non-standard itch.io host name the database after that
host instead; [resolveDatabasePath](resolveDatabasePath.md) handles those.

## Parameters

### itchPath

`string`

An itch user-data directory.

## Returns

`string`
