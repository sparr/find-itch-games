[find-itch-games](../README.md) / IItchUpload

# Interface: IItchUpload

Defined in: types.ts:101

The specific file/channel that was installed.

## Properties

### id

```ts
id: number;
```

Defined in: types.ts:102

***

### storage?

```ts
optional storage?: IItchUploadStorage;
```

Defined in: types.ts:103

***

### host?

```ts
optional host?: string;
```

Defined in: types.ts:105

Only set for `external` storage.

***

### filename?

```ts
optional filename?: string;
```

Defined in: types.ts:107

Original file name, e.g. `Overland_x64.zip`.

***

### displayName?

```ts
optional displayName?: string;
```

Defined in: types.ts:109

Name set by the developer, e.g. `Overland for Windows 64-bit`.

***

### size?

```ts
optional size?: number;
```

Defined in: types.ts:111

Size in bytes; for wharf uploads this is the archive size.

***

### channelName?

```ts
optional channelName?: string;
```

Defined in: types.ts:113

Set only for wharf (butler-pushed) uploads.

***

### buildId?

```ts
optional buildId?: number;
```

Defined in: types.ts:114

***

### build?

```ts
optional build?: IItchBuild;
```

Defined in: types.ts:115

***

### type?

```ts
optional type?: IItchUploadType;
```

Defined in: types.ts:116

***

### preorder?

```ts
optional preorder?: boolean;
```

Defined in: types.ts:117

***

### demo?

```ts
optional demo?: boolean;
```

Defined in: types.ts:118

***

### platforms?

```ts
optional platforms?: IItchPlatforms;
```

Defined in: types.ts:119

***

### createdAt?

```ts
optional createdAt?: string;
```

Defined in: types.ts:120

***

### updatedAt?

```ts
optional updatedAt?: string;
```

Defined in: types.ts:121
