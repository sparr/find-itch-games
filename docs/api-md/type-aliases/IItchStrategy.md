[find-itch-games](../README.md) / IItchStrategy

# Type Alias: IItchStrategy

```ts
type IItchStrategy = typeof ITCH_STRATEGIES[number];
```

Defined in: src/index.ts:80

Which of itch's records to trust.

- `merge` (default) reads butler.db and confirms each game against the
  receipt in its install folder, then adds any receipt the database has no
  row for. Most complete.
- `db` reads butler.db only. Fastest, and the only source of play times,
  launch candidates and custom install folders.
- `receipts` scans the install locations instead of reading caves. Useful
  when the database is out of date, but it loses the fields only the
  database has. Install locations still come from the database, since
  nothing on disk records them.
