import { ParsedDep, DepKind, SourceFormat } from "./types";
/** Normalise package name: lowercase, replace [-_.] with single - */
export declare function normaliseName(name: string): string;
/** Extract pinned version from specifier like "==4.2.7" → "4.2.7", ">=2.0" → null */
export declare function extractPinned(spec: string): string | null;
export declare function parseRequirementsTxt(content: string): ParsedDep[];
export declare function parsePEP621(content: string): ParsedDep[];
export declare function parseDepArray(block: string, kind: DepKind, out: ParsedDep[]): void;
export declare function parsePoetry(content: string): ParsedDep[];
export declare function parsePoetrySection(block: string, kind: DepKind, out: ParsedDep[]): void;
export declare function parsePDM(content: string): ParsedDep[];
export declare function parseUvLock(content: string): ParsedDep[];
export declare function parsePipfile(content: string): ParsedDep[];
export declare function parsePipfileLock(content: string): ParsedDep[];
export declare function parseDependencyFile(content: string, format: SourceFormat): ParsedDep[];
//# sourceMappingURL=parsers.d.ts.map