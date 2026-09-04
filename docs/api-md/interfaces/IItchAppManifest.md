[find-itch-games](../README.md) / IItchAppManifest

# Interface: IItchAppManifest

Defined in: src/manifest.ts:36

Everything itch knows about one installed game, flattened.

This is the itch counterpart of a Steam `appmanifest_*.acf`: it is stitched
together from the game's "cave" row in butler.db and the receipt itch wrote
into the install folder.

## Properties

### gameId

```ts
gameId: number;
```

Defined in: src/manifest.ts:38

itch.io game id -- the closest thing to a Steam appid.

***

### caveId?

```ts
optional caveId?: string;
```

Defined in: src/manifest.ts:40

itch's own id for this installation. Absent for receipt-only finds.

***

### title?

```ts
optional title?: string;
```

Defined in: src/manifest.ts:41

***

### url?

```ts
optional url?: string;
```

Defined in: src/manifest.ts:43

e.g. `https://hempuli.itch.io/a-solitaire-mystery`.

***

### slug?

```ts
optional slug?: string;
```

Defined in: src/manifest.ts:45

`a-solitaire-mystery` in the url above.

***

### author?

```ts
optional author?: string;
```

Defined in: src/manifest.ts:47

`hempuli` in the url above.

***

### classification?

```ts
optional classification?: string;
```

Defined in: src/manifest.ts:49

`game`, `tool`, `assets`, `game_mod`, ...

***

### path

```ts
path: string;
```

Defined in: src/manifest.ts:51

Absolute path to the installed game.

***

### installFolderName

```ts
installFolderName: string;
```

Defined in: src/manifest.ts:53

Name of the install folder itself.

***

### installLocationId?

```ts
optional installLocationId?: string;
```

Defined in: src/manifest.ts:55

Id of the install location holding it, if it is in a known one.

***

### customInstallFolder?

```ts
optional customInstallFolder?: string;
```

Defined in: src/manifest.ts:57

Set when the game was installed outside any install location.

***

### receiptPath?

```ts
optional receiptPath?: string;
```

Defined in: src/manifest.ts:59

Path of the on-disk receipt, when there is one.

***

### uploadId?

```ts
optional uploadId?: number;
```

Defined in: src/manifest.ts:60

***

### buildId?

```ts
optional buildId?: number;
```

Defined in: src/manifest.ts:61

***

### version?

```ts
optional version?: string;
```

Defined in: src/manifest.ts:63

The developer's own version string, for butler-pushed uploads.

***

### channelName?

```ts
optional channelName?: string;
```

Defined in: src/manifest.ts:65

butler channel, e.g. `native-console-linux-64`.

***

### installedAt?

```ts
optional installedAt?: string;
```

Defined in: src/manifest.ts:66

***

### lastPlayedAt?

```ts
optional lastPlayedAt?: string;
```

Defined in: src/manifest.ts:67

***

### secondsRun?

```ts
optional secondsRun?: number;
```

Defined in: src/manifest.ts:68

***

### installedSize?

```ts
optional installedSize?: number;
```

Defined in: src/manifest.ts:70

Size on disk in bytes, as itch last measured it.

***

### pinned?

```ts
optional pinned?: boolean;
```

Defined in: src/manifest.ts:71

***

### platforms?

```ts
optional platforms?: IItchPlatforms;
```

Defined in: src/manifest.ts:72

***

### candidates

```ts
candidates: IItchLaunchCandidate[];
```

Defined in: src/manifest.ts:74

Launchables butler found, with paths relative to [path](#path).

***

### game?

```ts
optional game?: IItchGame;
```

Defined in: src/manifest.ts:75

***

### upload?

```ts
optional upload?: IItchUpload;
```

Defined in: src/manifest.ts:76

***

### build?

```ts
optional build?: IItchBuild;
```

Defined in: src/manifest.ts:77

***

### source

```ts
source: IItchManifestSource;
```

Defined in: src/manifest.ts:78
