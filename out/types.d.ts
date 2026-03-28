import * as vscode from "vscode";
export type PackageStatus = "up-to-date" | "outdated" | "unpinned" | "error" | "unknown";
export type DepKind = "direct" | "dev" | "optional" | "transitive";
export type SourceFormat = "requirements.txt" | "requirements.in" | "pyproject.toml (PEP 621)" | "pyproject.toml (Poetry)" | "pyproject.toml (PDM)" | "uv.lock" | "Pipfile" | "Pipfile.lock";
export type MaintenanceStatus = "active" | "stale" | "unstable" | "unknown";
export interface ParsedDep {
    name: string;
    /** Pinned version string, null = unpinned/ranged */
    version: string | null;
    /** Original specifier e.g. ">=2.0,<3" */
    rawSpec: string;
    kind: DepKind;
}
export interface VersionVulnerability {
    id: string;
    summary: string;
    link?: string;
    fixedIn?: string[];
}
export interface PackageResult extends ParsedDep {
    latest: string | null;
    status: PackageStatus;
    pypiUrl: string;
    license: string | null;
    maintenance: MaintenanceStatus;
    latestReleaseDate: string | null;
    /**
     * `null` means not checked / unavailable (for unpinned, unknown versions, or request issues).
     * Empty array means checked and no known vulnerabilities were returned by PyPI.
     */
    vulnerabilities: VersionVulnerability[] | null;
    error?: string;
}
export interface DetectedFile {
    uri: vscode.Uri;
    format: SourceFormat;
    priority: number;
}
/** Status order for sorting — lower = shown first */
export declare const STATUS_ORDER: Record<PackageStatus, number>;
//# sourceMappingURL=types.d.ts.map