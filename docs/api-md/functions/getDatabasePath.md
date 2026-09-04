[find-itch-games](../README.md) / getDatabasePath

# Function: getDatabasePath()

```ts
function getDatabasePath(itchPath): string;
```

Defined in: itch.ts:79

The default butler database inside an itch user-data directory.

Builds pointed at a non-standard itch.io host name the database after that
host instead; [resolveDatabasePath](resolveDatabasePath.md) handles those.

## Parameters

### itchPath

`string`

An itch user-data directory.

## Returns

`string`
