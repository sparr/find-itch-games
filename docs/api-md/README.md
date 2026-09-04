# find-itch-games

Find the itch.io app, its install locations, and the games installed in them.

The entry point re-exports everything the library considers public. Start
with [findItch](functions/findItch.md) for the whole picture, or [findItchAppById](functions/findItchAppById.md) /
[findItchAppByName](functions/findItchAppByName.md) to locate one game.

## Classes

- [ItchNotFoundError](classes/ItchNotFoundError.md)
- [AppNotFoundError](classes/AppNotFoundError.md)
- [ItchDatabaseError](classes/ItchDatabaseError.md)
- [AmbiguousAppError](classes/AmbiguousAppError.md)

## Interfaces

- [IItchInstallLocationRow](interfaces/IItchInstallLocationRow.md)
- [IItchCaveRow](interfaces/IItchCaveRow.md)
- [IItchOptions](interfaces/IItchOptions.md)
- [IItchApp](interfaces/IItchApp.md)
- [IItchLibrary](interfaces/IItchLibrary.md)
- [IItchLibraries](interfaces/IItchLibraries.md)
- [IItchLookupOptions](interfaces/IItchLookupOptions.md)
- [IItchNameLookupOptions](interfaces/IItchNameLookupOptions.md)
- [IItchPathLookup](interfaces/IItchPathLookup.md)
- [IItchLibraryRaw](interfaces/IItchLibraryRaw.md)
- [IItchLibrariesRaw](interfaces/IItchLibrariesRaw.md)
- [IItchAppManifest](interfaces/IItchAppManifest.md)
- [IItchReceipt](interfaces/IItchReceipt.md)
- [IItchLegacyReceiptInfo](interfaces/IItchLegacyReceiptInfo.md)
- [IFoundReceipt](interfaces/IFoundReceipt.md)
- [IItchPlatforms](interfaces/IItchPlatforms.md)
- [IItchGame](interfaces/IItchGame.md)
- [IItchUser](interfaces/IItchUser.md)
- [IItchUpload](interfaces/IItchUpload.md)
- [IItchBuild](interfaces/IItchBuild.md)
- [IItchWindowsInfo](interfaces/IItchWindowsInfo.md)
- [IItchMacosInfo](interfaces/IItchMacosInfo.md)
- [IItchLinuxInfo](interfaces/IItchLinuxInfo.md)
- [IItchLoveInfo](interfaces/IItchLoveInfo.md)
- [IItchScriptInfo](interfaces/IItchScriptInfo.md)
- [IItchJarInfo](interfaces/IItchJarInfo.md)
- [IItchLaunchCandidate](interfaces/IItchLaunchCandidate.md)
- [IItchVerdict](interfaces/IItchVerdict.md)

## Type Aliases

- [IItchStrategy](type-aliases/IItchStrategy.md)
- [IItchLocationSource](type-aliases/IItchLocationSource.md)
- [IItchManifestSource](type-aliases/IItchManifestSource.md)
- [IItchArchitectures](type-aliases/IItchArchitectures.md)
- [IItchGameType](type-aliases/IItchGameType.md)
- [IItchGameClassification](type-aliases/IItchGameClassification.md)
- [IItchUploadStorage](type-aliases/IItchUploadStorage.md)
- [IItchUploadType](type-aliases/IItchUploadType.md)
- [IItchFlavor](type-aliases/IItchFlavor.md)
- [IItchArch](type-aliases/IItchArch.md)
- [IItchWindowsInstallerType](type-aliases/IItchWindowsInstallerType.md)

## Variables

- [ITCH\_STRATEGIES](variables/ITCH_STRATEGIES.md)
- [ITCH\_APP\_NAMES](variables/ITCH_APP_NAMES.md)
- [RECEIPT\_DIR](variables/RECEIPT_DIR.md)

## Functions

- [findItch](functions/findItch.md)
- [findItchApps](functions/findItchApps.md)
- [findItchLibrariesPaths](functions/findItchLibrariesPaths.md)
- [findItchLibraries](functions/findItchLibraries.md)
- [findItchAppManifest](functions/findItchAppManifest.md)
- [findItchAppsById](functions/findItchAppsById.md)
- [findItchAppById](functions/findItchAppById.md)
- [findItchAppsByName](functions/findItchAppsByName.md)
- [findItchAppByName](functions/findItchAppByName.md)
- [hasItchApp](functions/hasItchApp.md)
- [getItchPathCandidates](functions/getItchPathCandidates.md)
- [getDatabasePath](functions/getDatabasePath.md)
- [resolveDatabasePath](functions/resolveDatabasePath.md)
- [getPreferencesPath](functions/getPreferencesPath.md)
- [getAppdataInstallLocation](functions/getAppdataInstallLocation.md)
- [findItchPath](functions/findItchPath.md)
- [getLibraryDownloadsFolder](functions/getLibraryDownloadsFolder.md)
- [getStagingFolder](functions/getStagingFolder.md)
- [getInstallFolderPath](functions/getInstallFolderPath.md)
- [getLaunchCandidatePaths](functions/getLaunchCandidatePaths.md)
- [getManifestNames](functions/getManifestNames.md)
- [getReceiptPath](functions/getReceiptPath.md)
- [getLegacyReceiptPath](functions/getLegacyReceiptPath.md)
- [readReceipt](functions/readReceipt.md)
- [hasReceipt](functions/hasReceipt.md)
- [findReceipts](functions/findReceipts.md)
