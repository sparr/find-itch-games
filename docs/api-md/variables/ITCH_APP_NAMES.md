[find-itch-games](../README.md) / ITCH\_APP\_NAMES

# Variable: ITCH\_APP\_NAMES

```ts
const ITCH_APP_NAMES: readonly ["itch", "kitch"];
```

Defined in: src/itch.ts:25

The app names itch ships under.

The codebase builds two variants that install side by side: `itch` (stable)
and `kitch` (canary), selected by whether the release tag ends in `-canary`.
Each gets its own Electron `userData` directory.
