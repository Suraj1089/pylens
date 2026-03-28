import { ParsedDep, PackageResult, VersionVulnerability } from "./types";
/** Clear the session cache */
export declare function clearCache(): void;
/** Fetch the latest version of a single package from PyPI */
export declare function fetchLatestVersion(packageName: string, timeoutMs?: number): Promise<string>;
/** Fetch known vulnerabilities for a specific package version */
export declare function fetchVulnerabilities(packageName: string, version: string, timeoutMs?: number): Promise<VersionVulnerability[]>;
export interface FetchProgress {
    completed: number;
    total: number;
    current: string;
}
/**
 * Fetch package versions, health, and vulnerability data with concurrency control.
 * - 1 PyPI metadata request per package
 * - batched OSV vulnerability queries for pinned package versions
 */
export declare function fetchAllVersions(deps: ParsedDep[], onProgress?: (progress: FetchProgress) => void): Promise<PackageResult[]>;
//# sourceMappingURL=pypi.d.ts.map