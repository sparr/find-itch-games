[find-itch-games](../README.md) / IItchLibraries

# Interface: IItchLibraries

Defined in: src/index.ts:128

The full picture: where itch is, where it installs, and what is installed.

## Properties

### itchPath

```ts
itchPath: string;
```

Defined in: src/index.ts:129

***

### databasePath

```ts
databasePath: string;
```

Defined in: src/index.ts:130

***

### databaseAvailable

```ts
databaseAvailable: boolean;
```

Defined in: src/index.ts:131

***

### strategy

```ts
strategy: "db" | "merge" | "receipts";
```

Defined in: src/index.ts:132

***

### libraries

```ts
libraries: IItchLibrary[];
```

Defined in: src/index.ts:133
