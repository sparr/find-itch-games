[find-itch-games](../README.md) / IItchCaveRow

# Interface: IItchCaveRow

Defined in: [src/db.ts:35](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L35)

A "cave" is itch's record of one installed game.

## Properties

### id

```ts
id: string;
```

Defined in: [src/db.ts:37](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L37)

uuid identifying this installation.

***

### gameId

```ts
gameId: number;
```

Defined in: [src/db.ts:39](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L39)

itch.io game id.

***

### uploadId?

```ts
optional uploadId?: number;
```

Defined in: [src/db.ts:41](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L41)

The upload that was installed.

***

### buildId?

```ts
optional buildId?: number;
```

Defined in: [src/db.ts:43](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L43)

The wharf build that was installed; only for `storage: "build"` uploads.

***

### installLocationId?

```ts
optional installLocationId?: string;
```

Defined in: [src/db.ts:45](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L45)

Install location holding the game; unset when `customInstallFolder` is.

***

### installFolderName?

```ts
optional installFolderName?: string;
```

Defined in: [src/db.ts:47](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L47)

Folder name within the install location.

***

### customInstallFolder?

```ts
optional customInstallFolder?: string;
```

Defined in: [src/db.ts:49](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L49)

Absolute path used instead of an install location, if the user chose one.

***

### installedAt?

```ts
optional installedAt?: string;
```

Defined in: [src/db.ts:51](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L51)

When the game was last installed or updated.

***

### lastTouchedAt?

```ts
optional lastTouchedAt?: string;
```

Defined in: [src/db.ts:53](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L53)

Last run, reconciled with itch.io's cross-device play summary.

***

### lastPlayedAt?

```ts
optional lastPlayedAt?: string;
```

Defined in: [src/db.ts:55](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L55)

Last run on this machine, which itch tracks separately.

***

### secondsRun?

```ts
optional secondsRun?: number;
```

Defined in: [src/db.ts:57](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L57)

Total play time in seconds, as itch.io reports it across devices.

***

### installedSize?

```ts
optional installedSize?: number;
```

Defined in: [src/db.ts:59](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L59)

Size on disk in bytes, as itch last measured it.

***

### pinned?

```ts
optional pinned?: boolean;
```

Defined in: [src/db.ts:61](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L61)

Whether the user pinned this install in the itch app.

***

### verdict?

```ts
optional verdict?: IItchVerdict;
```

Defined in: [src/db.ts:63](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L63)

Butler's scan of the install folder: launch candidates and total size.

***

### game?

```ts
optional game?: IItchGame;
```

Defined in: [src/db.ts:65](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L65)

The joined `games` row, when itch still has one.

***

### upload?

```ts
optional upload?: IItchUpload;
```

Defined in: [src/db.ts:67](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L67)

The joined `uploads` row.

***

### build?

```ts
optional build?: IItchBuild;
```

Defined in: [src/db.ts:69](https://github.com/sparr/find-itch-games/blob/main/src/db.ts#L69)

The joined `builds` row.
