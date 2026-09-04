/**
 * The error types this library throws.
 *
 * @module
 */

/** Thrown when the itch app's user-data directory can't be located. */
export class ItchNotFoundError extends Error {
  public override readonly name = "ItchNotFoundError";

  constructor(searched?: readonly string[]) {
    super(
      searched?.length
        ? `itch installation not found. Searched:\n  ${searched.join("\n  ")}`
        : "itch installation not found",
    );
  }
}

/** Thrown when a game is installed nowhere itch knows about. */
export class AppNotFoundError extends Error {
  public override readonly name = "AppNotFoundError";

  constructor(public readonly query: string | number) {
    super(`itch game not found: ${query}`);
  }
}

/** Thrown when butler.db exists but can't be opened or read. */
export class ItchDatabaseError extends Error {
  public override readonly name = "ItchDatabaseError";

  constructor(
    public readonly databasePath: string,
    public override readonly cause: unknown,
  ) {
    super(
      `failed to read butler database at ${databasePath}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
  }
}

/**
 * Thrown when a lookup matches more than one installed game.
 *
 * Only raised when `strict` is set; otherwise the first match wins. Use
 * `findItchAppsByName` / `findItchAppsById` to see every match.
 */
export class AmbiguousAppError extends Error {
  public override readonly name = "AmbiguousAppError";

  constructor(
    public readonly query: string | number,
    public readonly paths: readonly string[],
  ) {
    super(
      `itch game "${query}" matched ${paths.length} installed games:\n  ${paths.join("\n  ")}`,
    );
  }
}
