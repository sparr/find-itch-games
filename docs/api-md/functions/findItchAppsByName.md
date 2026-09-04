[find-itch-games](../README.md) / findItchAppsByName

# Function: findItchAppsByName()

```ts
function findItchAppsByName(name, options?): Promise<IItchApp[]>;
```

Defined in: src/index.ts:463

Every installed game matching a title, url slug or install folder name.

Exact by default; pass `exact: false` for a fuzzy search. Results keep the
order of [findItchApps](findItchApps.md), so they are stable across calls.

## Parameters

### name

`string`

A title, url slug or install folder name.

### options?

[`IItchNameLookupOptions`](../interfaces/IItchNameLookupOptions.md) = `{}`

See [IItchNameLookupOptions](../interfaces/IItchNameLookupOptions.md).

## Returns

`Promise`\<[`IItchApp`](../interfaces/IItchApp.md)[]\>
