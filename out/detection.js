"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Detection — Auto-detect dependency files in the workspace
// ─────────────────────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPyprojectFlavour = detectPyprojectFlavour;
exports.detectPrimaryFile = detectPrimaryFile;
exports.detectAllFiles = detectAllFiles;
exports.detectFromActiveEditor = detectFromActiveEditor;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const FILE_PRIORITY = [
    { glob: "**/uv.lock", format: "uv.lock", priority: 1 },
    { glob: "**/Pipfile.lock", format: "Pipfile.lock", priority: 2 },
    { glob: "**/pyproject.toml", format: "pyproject.toml (PEP 621)", priority: 3 },
    { glob: "**/Pipfile", format: "Pipfile", priority: 4 },
    { glob: "**/requirements.in", format: "requirements.in", priority: 5 },
    { glob: "**/requirements.txt", format: "requirements.txt", priority: 5 },
    { glob: "**/requirements*.txt", format: "requirements.txt", priority: 6 },
    { glob: "**/requirements*.in", format: "requirements.in", priority: 7 },
];
const IGNORE_PATTERN = "{**/node_modules/**,**/.venv/**,**/venv/**,**/.tox/**,**/__pycache__/**}";
/** Detect pyproject.toml flavour from content */
function detectPyprojectFlavour(content) {
    if (/\[tool\.poetry\.dependencies\]/m.test(content)) {
        return "pyproject.toml (Poetry)";
    }
    if (/\[tool\.pdm\b/m.test(content)) {
        return "pyproject.toml (PDM)";
    }
    return "pyproject.toml (PEP 621)";
}
/** Detect the highest-priority dependency file in the workspace */
async function detectPrimaryFile() {
    const candidates = [];
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
    candidates.sort((a, b) => a.priority !== b.priority
        ? a.priority - b.priority
        : a.uri.fsPath.length - b.uri.fsPath.length);
    const top = candidates[0];
    if (path.basename(top.uri.fsPath) === "pyproject.toml") {
        const content = fs.readFileSync(top.uri.fsPath, "utf8");
        top.format = detectPyprojectFlavour(content);
    }
    return top;
}
/** Detect ALL dependency files in the workspace (for file selector) */
async function detectAllFiles() {
    const candidates = [];
    for (const { glob, format, priority } of FILE_PRIORITY) {
        const found = await vscode.workspace.findFiles(glob, IGNORE_PATTERN, 20);
        for (const uri of found) {
            if (!candidates.find((c) => c.uri.fsPath === uri.fsPath)) {
                let actualFormat = format;
                if (path.basename(uri.fsPath) === "pyproject.toml") {
                    try {
                        const content = fs.readFileSync(uri.fsPath, "utf8");
                        actualFormat = detectPyprojectFlavour(content);
                    }
                    catch {
                        // keep default
                    }
                }
                candidates.push({ uri, format: actualFormat, priority });
            }
        }
    }
    candidates.sort((a, b) => a.priority !== b.priority
        ? a.priority - b.priority
        : a.uri.fsPath.length - b.uri.fsPath.length);
    return candidates;
}
/** Try to detect from the active editor if it's a supported file */
function detectFromActiveEditor() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return null;
    }
    const fname = path.basename(activeEditor.document.fileName);
    const formatMap = {
        "requirements.txt": "requirements.txt",
        "requirements.in": "requirements.in",
        "pyproject.toml": "pyproject.toml (PEP 621)",
        "uv.lock": "uv.lock",
        Pipfile: "Pipfile",
        "Pipfile.lock": "Pipfile.lock",
    };
    if (fname in formatMap || /^requirements.*\.txt$/.test(fname) || /^requirements.*\.in$/.test(fname)) {
        let fmt = formatMap[fname] ?? (/\.in$/i.test(fname) ? "requirements.in" : "requirements.txt");
        if (fname === "pyproject.toml") {
            fmt = detectPyprojectFlavour(activeEditor.document.getText());
        }
        return { uri: activeEditor.document.uri, format: fmt, priority: 0 };
    }
    return null;
}
//# sourceMappingURL=detection.js.map