[find-itch-games](../README.md) / ITCH\_STRATEGIES

# Variable: ITCH\_STRATEGIES

```ts
const ITCH_STRATEGIES: readonly IItchStrategy[];
```

Defined in: [src/index.ts:76](https://github.com/sparr/find-itch-games/blob/main/node/src/index.ts#L76)

Every value [IItchStrategy](../type-aliases/IItchStrategy.md) accepts, in preference order.

Exported so callers can offer the choice without hard-coding the list, and
so an unknown value can be rejected rather than silently misread.

Frozen because it is the guard, not a registry: [findItch](../functions/findItch.md) dispatches
on these values directly, so widening the list would only disable the check
and let the new value fall through to `merge` behaviour.
