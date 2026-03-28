// ─────────────────────────────────────────────────────────────────────────────
// Detection — Auto-detect dependency files in the workspace
// ─────────────────────────────────────────────────────────────────────────────

import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DetectedFile, SourceFormat } from "./types";

const FILE_PRIORITY: Array<{ glob: string; format: SourceFormat; priority: number }> = [
  { glob: "**/uv.lock",           format: "uv.lock",                  priority: 1 },
  { glob: "**/Pipfile.lock",      format: "Pipfile.lock",             priority: 2 },
  { glob: "**/pyproject.toml",    format: "pyproject.toml (PEP 621)", priority: 3 },
  { glob: "**/Pipfile",           format: "Pipfile",                  priority: 4 },
  { glob: "**/requirements.in",   format: "requirements.in",          priority: 5 },
  { glob: "**/requirements.txt",  format: "requirements.txt",         priority: 5 },
  { glob: "**/requirements*.txt", format: "requirements.txt",         priority: 6 },
  { glob: "**/requirements*.in",  format: "requirements.in",          priority: 7 },
];

const IGNORE_PATTERN = "{**/node_modules/**,**/.venv/**,**/venv/**,**/.tox/**,**/__pycache__/**}";

/** Detect pyproject.toml flavour from content */
export function detectPyprojectFlavour(content: string): SourceFormat {
  if (/\[tool\.poetry\.dependencies\]/m.test(content)) {
    return "pyproject.toml (Poetry)";
  }
  if (/\[tool\.pdm\b/m.test(content)) {
    return "pyproject.toml (PDM)";
  }
  return "pyproject.toml (PEP 621)";
}

/** Detect the highest-priority dependency file in the workspace */
export async function detectPrimaryFile(): Promise<DetectedFile | null> {
  const candidates: DetectedFile[] = [];

  for (const { glob, format, priority } of FILE_PRIORITY) {
    const found = await vscode.workspace.findFiles(glob, IGNORE_PATTERN, 5);
    for (const uri of found) {
      if (!candidates.find((c) => c.uri.fsPath === uri.fsPath)) {
        candidates.push({ uri, format, priority });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) =>
    a.priority !== b.priority
      ? a.priority - b.priority
      : a.uri.fsPath.length - b.uri.fsPath.length
  );

  const top = candidates[0];
  if (path.basename(top.uri.fsPath) === "pyproject.toml") {
    const content = fs.readFileSync(top.uri.fsPath, "utf8");
    top.format = detectPyprojectFlavour(content);
  }

  return top;
}

/** Detect ALL dependency files in the workspace (for file selector) */
export async function detectAllFiles(): Promise<DetectedFile[]> {
  const candidates: DetectedFile[] = [];

  for (const { glob, format, priority } of FILE_PRIORITY) {
    const found = await vscode.workspace.findFiles(glob, IGNORE_PATTERN, 20);
    for (const uri of found) {
      if (!candidates.find((c) => c.uri.fsPath === uri.fsPath)) {
        let actualFormat = format;
        if (path.basename(uri.fsPath) === "pyproject.toml") {
          try {
            const content = fs.readFileSync(uri.fsPath, "utf8");
            actualFormat = detectPyprojectFlavour(content);
          } catch {
            // keep default
          }
        }
        candidates.push({ uri, format: actualFormat, priority });
      }
    }
  }

  candidates.sort((a, b) =>
    a.priority !== b.priority
      ? a.priority - b.priority
      : a.uri.fsPath.length - b.uri.fsPath.length
  );

  return candidates;
}

/** Try to detect from the active editor if it's a supported file */
export function detectFromActiveEditor(): DetectedFile | null {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) { return null; }

  const fname = path.basename(activeEditor.document.fileName);
  const formatMap: Record<string, SourceFormat> = {
    "requirements.txt": "requirements.txt",
    "requirements.in": "requirements.in",
    "pyproject.toml": "pyproject.toml (PEP 621)",
    "uv.lock": "uv.lock",
    Pipfile: "Pipfile",
    "Pipfile.lock": "Pipfile.lock",
  };

  if (fname in formatMap || /^requirements.*\.txt$/.test(fname) || /^requirements.*\.in$/.test(fname)) {
    let fmt: SourceFormat = formatMap[fname] ?? (/\.in$/i.test(fname) ? "requirements.in" : "requirements.txt");
    if (fname === "pyproject.toml") {
      fmt = detectPyprojectFlavour(activeEditor.document.getText());
    }
    return { uri: activeEditor.document.uri, format: fmt, priority: 0 };
  }

  return null;
}
