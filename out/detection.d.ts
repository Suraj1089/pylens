import { DetectedFile, SourceFormat } from "./types";
/** Detect pyproject.toml flavour from content */
export declare function detectPyprojectFlavour(content: string): SourceFormat;
/** Detect the highest-priority dependency file in the workspace */
export declare function detectPrimaryFile(): Promise<DetectedFile | null>;
/** Detect ALL dependency files in the workspace (for file selector) */
export declare function detectAllFiles(): Promise<DetectedFile[]>;
/** Try to detect from the active editor if it's a supported file */
export declare function detectFromActiveEditor(): DetectedFile | null;
//# sourceMappingURL=detection.d.ts.map