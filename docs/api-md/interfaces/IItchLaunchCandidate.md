[find-itch-games](../README.md) / IItchLaunchCandidate

# Interface: IItchLaunchCandidate

Defined in: types.ts:200

A launchable target butler found while scanning an install folder.

`path` is relative to the install folder; use `getLaunchCandidatePaths()` to
resolve it.

## Properties

### path

```ts
path: string;
```

Defined in: types.ts:201

***

### mode?

```ts
optional mode?: number;
```

Defined in: types.ts:203

File permission bits.

***

### depth?

```ts
optional depth?: number;
```

Defined in: types.ts:205

Number of path elements leading up to this candidate.

***

### flavor?

```ts
optional flavor?: IItchFlavor;
```

Defined in: types.ts:206

***

### arch?

```ts
optional arch?: IItchArch;
```

Defined in: types.ts:207

***

### size?

```ts
optional size?: number;
```

Defined in: types.ts:208

***

### spell?

```ts
optional spell?: string[];
```

Defined in: types.ts:210

Raw output from itch's `wizardry` file-type detection.

***

### windowsInfo?

```ts
optional windowsInfo?: IItchWindowsInfo;
```

Defined in: types.ts:211

***

### linuxInfo?

```ts
optional linuxInfo?: IItchLinuxInfo;
```

Defined in: types.ts:212

***

### macosInfo?

```ts
optional macosInfo?: IItchMacosInfo;
```

Defined in: types.ts:213

***

### loveInfo?

```ts
optional loveInfo?: IItchLoveInfo;
```

Defined in: types.ts:214

***

### scriptInfo?

```ts
optional scriptInfo?: IItchScriptInfo;
```

Defined in: types.ts:215

***

### jarInfo?

```ts
optional jarInfo?: IItchJarInfo;
```

Defined in: types.ts:216

***

### metadata?

```ts
optional metadata?: Record<string, unknown>;
```

Defined in: types.ts:217
