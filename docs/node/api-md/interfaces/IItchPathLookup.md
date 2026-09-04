[find-itch-games](../README.md) / IItchPathLookup

# Interface: IItchPathLookup

Defined in: [src/itch.ts:37](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L37)

Where to look for itch, when not the current user on the current machine.

Every field defaults to the ambient value, so passing nothing searches for
the running user's own installation. Supplying them lets a caller ask where
itch *would* be for another home directory, environment or operating system
-- useful for tools that scan several user profiles or inspect a mounted
disk, and the reason this library's own tests never have to mutate
`process.env`.

## Properties

### home?

```ts
optional home?: string;
```

Defined in: [src/itch.ts:43](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L43)

Home directory to resolve `~`-relative candidates against.

#### Default Value

`os.homedir()`

***

### env?

```ts
optional env?: Record<string, string | undefined>;
```

Defined in: [src/itch.ts:50](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L50)

Environment to read `APPDATA`, `XDG_CONFIG_HOME` and this library's own
overrides from.

#### Default Value

`process.env`

***

### platform?

```ts
optional platform?: Platform;
```

Defined in: [src/itch.ts:56](https://github.com/sparr/find-itch-games/blob/main/node/src/itch.ts#L56)

Operating system whose conventions to follow.

#### Default Value

`process.platform`
