/**
 * Compare two version strings numerically.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export declare function compareVersions(a: string, b: string): number;
/**
 * Format a version difference as a human-readable string.
 * e.g. "2.0.0 → 3.1.0" = "major update", "2.0.0 → 2.1.0" = "minor update"
 */
export declare function getUpdateType(current: string, latest: string): "major" | "minor" | "patch" | "unknown";
//# sourceMappingURL=versions.d.ts.map