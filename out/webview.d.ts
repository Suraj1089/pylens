import { PackageResult, DetectedFile } from "./types";
export declare function escHtml(s: string): string;
export declare function buildLoadingHtml(total: number, format: string): string;
export declare function buildWebviewHtml(packages: PackageResult[], file: DetectedFile): string;
export interface SidebarStats {
    total: number;
    outdated: number;
    upToDate: number;
    unpinned: number;
    errors: number;
    fileName: string;
    format: string;
    healthPct: number;
    lastScanned: string | null;
}
export declare function buildSidebarHtml(stats: SidebarStats | null, isScanning: boolean): string;
//# sourceMappingURL=webview.d.ts.map