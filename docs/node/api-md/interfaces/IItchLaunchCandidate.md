[find-itch-games](../README.md) / IItchLaunchCandidate

# Interface: IItchLaunchCandidate

Defined in: [src/types.ts:200](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L200)

A launchable target butler found while scanning an install folder.

`path` is relative to the install folder; use `getLaunchCandidatePaths()` to
resolve it.

## Properties

### path

```ts
path: string;
```

Defined in: [src/types.ts:201](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L201)

***

### mode?

```ts
optional mode?: number;
```

Defined in: [src/types.ts:203](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L203)

File permission bits.

***

### depth?

```ts
optional depth?: number;
```

Defined in: [src/types.ts:205](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L205)

Number of path elements leading up to this candidate.

***

### flavor?

```ts
optional flavor?: IItchFlavor;
```

Defined in: [src/types.ts:206](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L206)

***

### arch?

```ts
optional arch?: IItchArch;
```

Defined in: [src/types.ts:207](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L207)

***

### size?

```ts
optional size?: number;
```

Defined in: [src/types.ts:208](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L208)

***

### spell?

```ts
optional spell?: string[];
```

Defined in: [src/types.ts:210](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L210)

Raw output from itch's `wizardry` file-type detection.

***

### windowsInfo?

```ts
optional windowsInfo?: IItchWindowsInfo;
```

Defined in: [src/types.ts:211](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L211)

***

### linuxInfo?

```ts
optional linuxInfo?: IItchLinuxInfo;
```

Defined in: [src/types.ts:212](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L212)

***

### macosInfo?

```ts
optional macosInfo?: IItchMacosInfo;
```

Defined in: [src/types.ts:213](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L213)

***

### loveInfo?

```ts
optional loveInfo?: IItchLoveInfo;
```

Defined in: [src/types.ts:214](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L214)

***

### scriptInfo?

```ts
optional scriptInfo?: IItchScriptInfo;
```

Defined in: [src/types.ts:215](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L215)

***

### jarInfo?

```ts
optional jarInfo?: IItchJarInfo;
```

Defined in: [src/types.ts:216](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L216)

***

### metadata?

```ts
optional metadata?: Record<string, unknown>;
```

Defined in: [src/types.ts:217](https://github.com/sparr/find-itch-games/blob/main/node/src/types.ts#L217)
