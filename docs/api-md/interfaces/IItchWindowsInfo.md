[find-itch-games](../README.md) / IItchWindowsInfo

# Interface: IItchWindowsInfo

Defined in: types.ts:161

Details of a native Windows executable or installer candidate.

## Properties

### installerType?

```ts
optional installerType?: IItchWindowsInstallerType;
```

Defined in: types.ts:162

***

### uninstaller?

```ts
optional uninstaller?: boolean;
```

Defined in: types.ts:164

True if this looks like an uninstaller rather than an installer.

***

### gui?

```ts
optional gui?: boolean;
```

Defined in: types.ts:166

Marked as a GUI subsystem binary. A hint, not a guarantee.

***

### dotNet?

```ts
optional dotNet?: boolean;
```

Defined in: types.ts:167
