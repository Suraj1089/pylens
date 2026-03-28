// ─────────────────────────────────────────────────────────────────────────────
// Extension — Main entry point for PyLens
// ─────────────────────────────────────────────────────────────────────────────

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import { PackageResult, DetectedFile, STATUS_ORDER, SourceFormat } from "./types";
import { parseDependencyFile, normaliseName } from "./parsers";
import { detectPrimaryFile, detectAllFiles, detectFromActiveEditor, detectPyprojectFlavour } from "./detection";
import { fetchAllVersions, clearCache, fetchLatestVersion } from "./pypi";
import { buildLoadingHtml, buildWebviewHtml, SidebarStats } from "./webview";
import { PyLensSidebarProvider } from "./sidebar";

// ── State ────────────────────────────────────────────────────────────────────

let lastResults: PackageResult[] | null = null;
let lastFile: DetectedFile | null = null;
let statusBarItem: vscode.StatusBarItem;
let sidebarProvider: PyLensSidebarProvider;
let currentPanel: vscode.WebviewPanel | null = null;

// ── Core Scan ────────────────────────────────────────────────────────────────

async function runScan(
  context: vscode.ExtensionContext,
  forceFile?: DetectedFile
): Promise<void> {
  // 1. Detect file
  let detected = forceFile ?? detectFromActiveEditor() ?? (await detectPrimaryFile());

  if (!detected) {
    vscode.window.showErrorMessage(
      "PyLens: No dependency file found. Supports requirements*.txt, requirements*.in, pyproject.toml, uv.lock, Pipfile, Pipfile.lock."
    );
    return;
  }

  // 2. Parse
  let content: string;
  try {
    content = fs.readFileSync(detected.uri.fsPath, "utf8");
  } catch (err) {
    vscode.window.showErrorMessage(
      `PyLens: Could not read ${path.basename(detected.uri.fsPath)}: ${err instanceof Error ? err.message : err}`
    );
    return;
  }

  const parsed = parseDependencyFile(content, detected.format);

  if (parsed.length === 0) {
    vscode.window.showInformationMessage(
      `PyLens: No packages found in ${path.basename(detected.uri.fsPath)}.`
    );
    return;
  }

  // 3. Create or reveal webview panel
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      "pylens",
      `PyLens — ${path.basename(detected.uri.fsPath)}`,
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    currentPanel.onDidDispose(() => {
      currentPanel = null;
    });

    // Handle webview messages
    currentPanel.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg.type) {
          case "refresh":
            clearCache();
            await runScan(context, lastFile ?? undefined);
            break;
          case "export":
            if (msg.format === "json") {
              exportJson();
            } else if (msg.format === "csv") {
              exportCsv();
            }
            break;
          case "update":
            if (typeof msg.name === "string" && typeof msg.latest === "string") {
              await updateDependencyVersion(context, msg.name, msg.latest);
            }
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  // Update sidebar to scanning state
  sidebarProvider.setScanning(true);

  // 4. Show loading
  currentPanel.webview.html = buildLoadingHtml(parsed.length, detected.format);

  // 5. Fetch versions with progress
  const results = await fetchAllVersions(parsed, (progress) => {
    if (currentPanel) {
      currentPanel.webview.postMessage({
        type: "progress",
        completed: progress.completed,
        total: progress.total,
        current: progress.current,
      });
    }
  });

  // 6. Sort results
  results.sort((a, b) =>
    STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]
      ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      : a.name.localeCompare(b.name)
  );

  // 7. Store results and update UI
  lastResults = results;
  lastFile = detected;

  currentPanel.title = `PyLens — ${path.basename(detected.uri.fsPath)}`;
  currentPanel.webview.html = buildWebviewHtml(results, detected);

  // 8. Update status bar
  const outdatedCount = results.filter((r) => r.status === "outdated").length;
  updateStatusBar(outdatedCount, results.length);

  // 9. Update sidebar
  const stats = buildSidebarStats(results, detected);
  sidebarProvider.updateStats(stats);
}

// ── Sidebar Stats Builder ────────────────────────────────────────────────────

function buildSidebarStats(results: PackageResult[], file: DetectedFile): SidebarStats {
  const total = results.length;
  const outdated = results.filter((r) => r.status === "outdated").length;
  const upToDate = results.filter((r) => r.status === "up-to-date").length;
  const unpinned = results.filter((r) => r.status === "unpinned").length;
  const errors = results.filter((r) => r.status === "error").length;
  const healthPct = total > 0 ? Math.round((upToDate / total) * 100) : 100;

  return {
    total,
    outdated,
    upToDate,
    unpinned,
    errors,
    fileName: vscode.workspace.asRelativePath(file.uri),
    format: file.format,
    healthPct,
    lastScanned: new Date().toLocaleTimeString(),
  };
}

// ── Status Bar ───────────────────────────────────────────────────────────────

function updateStatusBar(outdated: number, total: number): void {
  if (outdated > 0) {
    statusBarItem.text = `$(warning) PyLens: ${outdated} outdated`;
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  } else {
    statusBarItem.text = `$(check) PyLens: ${total} up to date`;
    statusBarItem.backgroundColor = undefined;
  }
  statusBarItem.tooltip = `${total} packages scanned — click to view report`;
  statusBarItem.show();
}

// ── File Selector ────────────────────────────────────────────────────────────

async function selectFile(context: vscode.ExtensionContext): Promise<void> {
  const files = await detectAllFiles();

  if (files.length === 0) {
    vscode.window.showWarningMessage("PyLens: No dependency files found in the workspace.");
    return;
  }

  const items = files.map((f) => ({
    label: path.basename(f.uri.fsPath),
    description: f.format,
    detail: vscode.workspace.asRelativePath(f.uri),
    file: f,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a dependency file to analyze",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (selected) {
    await runScan(context, selected.file);
  }
}

// ── Update Dependency Version ───────────────────────────────────────────────

interface ContentUpdateResult {
  content: string;
  changed: boolean;
}

type DependencyUpdateMode = "file-only" | "file-and-run-command";

interface QuickUpdateCommandArgs {
  uri: string;
  packageName: string;
  latest: string;
}

function getDependencyUpdateMode(): DependencyUpdateMode {
  const raw = vscode.workspace.getConfiguration("pylens").get<string>("dependencyUpdateMode", "file-only");
  return raw === "file-and-run-command" ? raw : "file-only";
}

function getRequirementsInCompileOnUpdate(): boolean {
  return vscode.workspace.getConfiguration("pylens").get<boolean>("requirementsInCompileOnUpdate", true);
}

function resolveCommandTemplate(template: string, file: DetectedFile): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(file.uri)?.uri.fsPath ?? "";
  const relativeFile = vscode.workspace.asRelativePath(file.uri);

  return template
    .replace(/\$\{workspaceFolder\}/g, workspaceFolder)
    .replace(/\$\{dependencyFile\}/g, file.uri.fsPath)
    .replace(/\$\{dependencyFileRelative\}/g, relativeFile);
}

function buildPostUpdateCommand(file: DetectedFile): string | null {
  const template = vscode.workspace.getConfiguration("pylens").get<string>("postUpdateCommand", "").trim();
  if (!template) { return null; }
  return resolveCommandTemplate(template, file);
}

function buildRequirementsInCompileCommand(file: DetectedFile): string | null {
  const template = vscode.workspace.getConfiguration("pylens").get<string>("requirementsInCompileCommand", "").trim();
  if (!template) { return null; }
  return resolveCommandTemplate(template, file);
}

function runCommandInTerminal(name: string, command: string, file: DetectedFile): void {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(file.uri)?.uri.fsPath;
  const terminal = vscode.window.createTerminal({ name, cwd: workspaceFolder });
  terminal.show(true);
  terminal.sendText(command, true);
}

function runPostUpdateCommand(file: DetectedFile): void {
  const command = buildPostUpdateCommand(file);
  if (!command) {
    vscode.window.showWarningMessage(
      "PyLens: Set `pylens.postUpdateCommand` to run a terminal install/update command."
    );
    return;
  }

  runCommandInTerminal("PyLens Update", command, file);
}

function runRequirementsInCompileCommand(file: DetectedFile): void {
  const command = buildRequirementsInCompileCommand(file);
  if (!command) {
    vscode.window.showWarningMessage(
      "PyLens: Set `pylens.requirementsInCompileCommand` to compile requirements.in files."
    );
    return;
  }

  runCommandInTerminal("PyLens Compile", command, file);
}

function runConfiguredPostUpdateAction(file: DetectedFile): void {
  if (getDependencyUpdateMode() !== "file-and-run-command") {
    return;
  }

  if (file.format === "requirements.in" && getRequirementsInCompileOnUpdate()) {
    runRequirementsInCompileCommand(file);
    return;
  }

  runPostUpdateCommand(file);
}

async function runPostUpdateCommandFromCommand(): Promise<void> {
  const file = lastFile ?? detectFromActiveEditor() ?? (await detectPrimaryFile());
  if (!file) {
    vscode.window.showWarningMessage(
      "PyLens: No dependency file found. Scan a file first or open one in the editor."
    );
    return;
  }
  runPostUpdateCommand(file);
}

async function runRequirementsInCompileCommandFromCommand(): Promise<void> {
  let file = lastFile ?? detectFromActiveEditor() ?? (await detectPrimaryFile());
  if (!file || file.format !== "requirements.in") {
    const all = await detectAllFiles();
    file = all.find((f) => f.format === "requirements.in") ?? null;
  }

  if (!file || file.format !== "requirements.in") {
    vscode.window.showWarningMessage(
      "PyLens: No requirements.in file found. Open one or add one to the workspace."
    );
    return;
  }

  runRequirementsInCompileCommand(file);
}

function detectFormatForDocument(document: vscode.TextDocument): SourceFormat | null {
  const fileName = path.basename(document.uri.fsPath);

  if (/^requirements.*\.txt$/i.test(fileName)) { return "requirements.txt"; }
  if (/^requirements.*\.in$/i.test(fileName)) { return "requirements.in"; }
  if (fileName === "pyproject.toml") { return detectPyprojectFlavour(document.getText()); }
  if (fileName === "uv.lock") { return "uv.lock"; }
  if (fileName === "Pipfile") { return "Pipfile"; }
  if (fileName === "Pipfile.lock") { return "Pipfile.lock"; }
  return null;
}

function parseQuickUpdateCommandArgs(value: unknown): QuickUpdateCommandArgs | null {
  if (!value || typeof value !== "object") { return null; }
  const arg = value as { uri?: unknown; packageName?: unknown; latest?: unknown };
  if (
    typeof arg.uri !== "string" ||
    typeof arg.packageName !== "string" ||
    typeof arg.latest !== "string"
  ) {
    return null;
  }
  return {
    uri: arg.uri,
    packageName: arg.packageName,
    latest: arg.latest,
  };
}

async function applyDependencyUpdate(
  context: vscode.ExtensionContext,
  file: DetectedFile,
  packageName: string,
  latestVersion: string
): Promise<void> {
  const latest = latestVersion.trim();
  if (!latest) {
    vscode.window.showWarningMessage("PyLens: Missing latest version for update.");
    return;
  }

  let document: vscode.TextDocument;
  try {
    document =
      vscode.workspace.textDocuments.find((d) => d.uri.toString() === file.uri.toString()) ??
      (await vscode.workspace.openTextDocument(file.uri));
  } catch (err) {
    vscode.window.showErrorMessage(
      `PyLens: Could not read ${path.basename(file.uri.fsPath)}: ${err instanceof Error ? err.message : err}`
    );
    return;
  }

  const content = document.getText();
  const result = updateDependencyFileContent(content, file.format, packageName, latest);
  if (!result.changed) {
    vscode.window.showInformationMessage(
      `PyLens: Could not update ${packageName}. No editable pinned entry found in ${path.basename(file.uri.fsPath)}.`
    );
    return;
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(content.length)
  );
  const edit = new vscode.WorkspaceEdit();
  edit.replace(file.uri, fullRange, result.content);
  const applied = await vscode.workspace.applyEdit(edit);
  if (!applied) {
    vscode.window.showErrorMessage(`PyLens: Failed to apply update to ${path.basename(file.uri.fsPath)}.`);
    return;
  }
  await document.save();

  vscode.window.showInformationMessage(
    `PyLens: Updated ${packageName} to ${latest} in ${vscode.workspace.asRelativePath(file.uri)}.`
  );

  runConfiguredPostUpdateAction(file);

  clearCache();
  if (lastFile && lastFile.uri.fsPath === file.uri.fsPath) {
    await runScan(context, file);
  }
}

async function updateDependencyVersion(
  context: vscode.ExtensionContext,
  packageName: string,
  latestVersion: string
): Promise<void> {
  if (!lastFile) {
    vscode.window.showWarningMessage("PyLens: No scanned file selected yet. Run a scan first.");
    return;
  }

  await applyDependencyUpdate(context, lastFile, packageName, latestVersion);
}

async function quickUpdateDependencyFromHover(
  context: vscode.ExtensionContext,
  rawArgs: unknown
): Promise<void> {
  const args = parseQuickUpdateCommandArgs(rawArgs);
  if (!args) {
    vscode.window.showWarningMessage("PyLens: Invalid quick update request.");
    return;
  }

  let uri: vscode.Uri;
  try {
    uri = vscode.Uri.parse(args.uri);
  } catch {
    vscode.window.showWarningMessage("PyLens: Invalid file target for quick update.");
    return;
  }

  let document: vscode.TextDocument;
  try {
    document = await vscode.workspace.openTextDocument(uri);
  } catch {
    vscode.window.showWarningMessage("PyLens: Could not open the dependency file for quick update.");
    return;
  }

  const format = detectFormatForDocument(document);
  if (!format) {
    vscode.window.showWarningMessage("PyLens: Quick Update is only available for requirements and pyproject files.");
    return;
  }

  const file: DetectedFile = { uri: document.uri, format, priority: 0 };
  await applyDependencyUpdate(context, file, args.packageName, args.latest);
}

function markerSuffix(spec: string): string {
  const markerIndex = spec.indexOf(";");
  if (markerIndex === -1) { return ""; }
  const marker = spec.slice(markerIndex).trim();
  return marker ? ` ${marker}` : "";
}

function updateRequirementsContent(content: string, packageName: string, latest: string): ContentUpdateResult {
  const target = normaliseName(packageName);
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  let changed = false;

  const lines = content.split(/\r?\n/).map((line) => {
    const commentIndex = line.indexOf("#");
    const body = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const comment = commentIndex >= 0 ? line.slice(commentIndex) : "";

    const match = /^(\s*)([A-Za-z0-9_.-]+)(\[[^\]]+\])?\s*([^#]*?)(\s*)$/.exec(body);
    if (!match) { return line; }

    const depName = match[2];
    if (normaliseName(depName) !== target) { return line; }

    const extras = match[3] ?? "";
    const spec = (match[4] ?? "").trim();
    const updatedBody = `${match[1]}${depName}${extras}==${latest}${markerSuffix(spec)}${match[5] ?? ""}`;
    const updatedLine = `${updatedBody}${comment}`;

    if (updatedLine !== line) {
      changed = true;
    }
    return updatedLine;
  });

  return { content: lines.join(eol), changed };
}

function updateQuotedDependencyArrayBlock(block: string, packageName: string, latest: string): ContentUpdateResult {
  const target = normaliseName(packageName);
  let changed = false;

  const updated = block.replace(/(["'])([^"'\r\n]+)\1/g, (full, quote: string, raw: string) => {
    const parsed = /^([A-Za-z0-9_.-]+)(\[[^\]]+\])?\s*(.*)$/.exec(raw.trim());
    if (!parsed) { return full; }

    const depName = parsed[1];
    if (normaliseName(depName) !== target || normaliseName(depName) === "python") {
      return full;
    }

    const extras = parsed[2] ?? "";
    const spec = parsed[3] ?? "";
    const nextRaw = `${depName}${extras}==${latest}${markerSuffix(spec)}`;
    const replacement = `${quote}${nextRaw}${quote}`;

    if (replacement !== full) {
      changed = true;
    }
    return replacement;
  });

  return { content: updated, changed };
}

function updatePEP621Content(content: string, packageName: string, latest: string): ContentUpdateResult {
  let changed = false;
  let out = content;

  out = out.replace(
    /(\[project\][^[]*?dependencies\s*=\s*\[)([\s\S]*?)(\])/m,
    (full, start: string, block: string, end: string) => {
      const updated = updateQuotedDependencyArrayBlock(block, packageName, latest);
      if (!updated.changed) { return full; }
      changed = true;
      return `${start}${updated.content}${end}`;
    }
  );

  out = out.replace(
    /(\[project\.optional-dependencies\][\s\S]*?)(?=\n\[|$)/m,
    (section) => {
      let sectionChanged = false;
      const updatedSection = section.replace(
        /(\w+\s*=\s*\[)([\s\S]*?)(\])/gm,
        (full, start: string, block: string, end: string) => {
          const updated = updateQuotedDependencyArrayBlock(block, packageName, latest);
          if (!updated.changed) { return full; }
          sectionChanged = true;
          return `${start}${updated.content}${end}`;
        }
      );
      if (sectionChanged) {
        changed = true;
      }
      return updatedSection;
    }
  );

  return { content: out, changed };
}

function updatePoetrySection(block: string, packageName: string, latest: string): ContentUpdateResult {
  const target = normaliseName(packageName);
  const eol = block.includes("\r\n") ? "\r\n" : "\n";
  let changed = false;

  const lines = block.split(/\r?\n/).map((line) => {
    const match = /^(\s*)([A-Za-z0-9_.-]+)(\s*=\s*)(.+?)(\s*(?:#.*)?)$/.exec(line);
    if (!match) { return line; }

    const depName = match[2];
    if (normaliseName(depName) !== target || normaliseName(depName) === "python") {
      return line;
    }

    const currentValue = match[4].trim();
    let nextValue = currentValue;

    if (currentValue.startsWith("{")) {
      if (/version\s*=/.test(currentValue)) {
        nextValue = currentValue.replace(/version\s*=\s*"[^"]*"/, `version = "${latest}"`);
      } else {
        nextValue = currentValue.replace(/\}\s*$/, `, version = "${latest}" }`);
      }
    } else {
      nextValue = `"${latest}"`;
    }

    const updatedLine = `${match[1]}${depName}${match[3]}${nextValue}${match[5] ?? ""}`;
    if (updatedLine !== line) {
      changed = true;
    }
    return updatedLine;
  });

  return { content: lines.join(eol), changed };
}

function updatePoetryContent(content: string, packageName: string, latest: string): ContentUpdateResult {
  let changed = false;
  let out = content;

  const sectionPatterns = [
    /(\[tool\.poetry\.dependencies\])([\s\S]*?)(?=\n\[|$)/m,
    /(\[tool\.poetry\.dev-dependencies\])([\s\S]*?)(?=\n\[|$)/m,
    /(\[tool\.poetry\.group\.\w+\.dependencies\])([\s\S]*?)(?=\n\[|$)/gm,
  ];

  for (const pattern of sectionPatterns) {
    out = out.replace(pattern, (full, header: string, block: string) => {
      const updated = updatePoetrySection(block, packageName, latest);
      if (!updated.changed) { return full; }
      changed = true;
      return `${header}${updated.content}`;
    });
  }

  return { content: out, changed };
}

function updatePDMContent(content: string, packageName: string, latest: string): ContentUpdateResult {
  const pepUpdated = updatePEP621Content(content, packageName, latest);
  let changed = pepUpdated.changed;
  let out = pepUpdated.content;

  out = out.replace(
    /(\[tool\.pdm\.dev-dependencies\][\s\S]*?)(?=\n\[|$)/m,
    (section) => {
      let sectionChanged = false;
      const updatedSection = section.replace(
        /(\w+\s*=\s*\[)([\s\S]*?)(\])/gm,
        (full, start: string, block: string, end: string) => {
          const updated = updateQuotedDependencyArrayBlock(block, packageName, latest);
          if (!updated.changed) { return full; }
          sectionChanged = true;
          return `${start}${updated.content}${end}`;
        }
      );
      if (sectionChanged) {
        changed = true;
      }
      return updatedSection;
    }
  );

  return { content: out, changed };
}

function updatePipfileSection(block: string, packageName: string, latest: string): ContentUpdateResult {
  const target = normaliseName(packageName);
  const eol = block.includes("\r\n") ? "\r\n" : "\n";
  let changed = false;

  const lines = block.split(/\r?\n/).map((line) => {
    const match = /^(\s*)([A-Za-z0-9_.-]+)(\s*=\s*)"([^"]*)"(\s*(?:#.*)?)$/.exec(line);
    if (!match) { return line; }

    const depName = match[2];
    if (normaliseName(depName) !== target || normaliseName(depName) === "python") {
      return line;
    }

    const updatedLine = `${match[1]}${depName}${match[3]}"==${latest}"${match[5] ?? ""}`;
    if (updatedLine !== line) {
      changed = true;
    }
    return updatedLine;
  });

  return { content: lines.join(eol), changed };
}

function updatePipfileContent(content: string, packageName: string, latest: string): ContentUpdateResult {
  let changed = false;
  let out = content;

  const sectionPatterns = [
    /(\[packages\])([\s\S]*?)(?=\n\[|$)/m,
    /(\[dev-packages\])([\s\S]*?)(?=\n\[|$)/m,
  ];

  for (const pattern of sectionPatterns) {
    out = out.replace(pattern, (full, header: string, block: string) => {
      const updated = updatePipfileSection(block, packageName, latest);
      if (!updated.changed) { return full; }
      changed = true;
      return `${header}${updated.content}`;
    });
  }

  return { content: out, changed };
}

function updatePipfileLockContent(content: string, packageName: string, latest: string): ContentUpdateResult {
  const target = normaliseName(packageName);
  let changed = false;
  let data: Record<string, Record<string, { version?: string }>>;

  try {
    data = JSON.parse(content);
  } catch {
    return { content, changed: false };
  }

  for (const sectionName of ["default", "develop"]) {
    const section = data[sectionName];
    if (!section || typeof section !== "object") { continue; }

    for (const [name, info] of Object.entries(section)) {
      if (normaliseName(name) !== target || normaliseName(name) === "python") { continue; }
      if (!info || typeof info !== "object") { continue; }
      const nextVersion = `==${latest}`;
      if (info.version !== nextVersion) {
        info.version = nextVersion;
        changed = true;
      }
    }
  }

  if (!changed) {
    return { content, changed: false };
  }

  const trailingNewline = content.endsWith("\n");
  return {
    content: `${JSON.stringify(data, null, 2)}${trailingNewline ? "\n" : ""}`,
    changed: true,
  };
}

function updateUvLockContent(content: string, packageName: string, latest: string): ContentUpdateResult {
  const target = normaliseName(packageName);
  let changed = false;

  const updated = content.replace(
    /\[\[package\]\][\s\S]*?(?=\n\[\[package\]\]|$)/g,
    (block) => {
      const nameMatch = block.match(/^name\s*=\s*"([^"]+)"/m);
      if (!nameMatch) { return block; }

      const depName = nameMatch[1];
      if (normaliseName(depName) !== target || normaliseName(depName) === "python") {
        return block;
      }

      const nextBlock = block.replace(
        /^version\s*=\s*"([^"]+)"/m,
        `version = "${latest}"`
      );
      if (nextBlock !== block) {
        changed = true;
      }
      return nextBlock;
    }
  );

  return { content: updated, changed };
}

function updateDependencyFileContent(
  content: string,
  format: DetectedFile["format"],
  packageName: string,
  latest: string
): ContentUpdateResult {
  switch (format) {
    case "requirements.txt":
    case "requirements.in":
      return updateRequirementsContent(content, packageName, latest);
    case "pyproject.toml (PEP 621)":
      return updatePEP621Content(content, packageName, latest);
    case "pyproject.toml (Poetry)":
      return updatePoetryContent(content, packageName, latest);
    case "pyproject.toml (PDM)":
      return updatePDMContent(content, packageName, latest);
    case "uv.lock":
      return updateUvLockContent(content, packageName, latest);
    case "Pipfile":
      return updatePipfileContent(content, packageName, latest);
    case "Pipfile.lock":
      return updatePipfileLockContent(content, packageName, latest);
    default:
      return { content, changed: false };
  }
}

// ── Hover Provider ───────────────────────────────────────────────────────────

function findNearestTomlSection(document: vscode.TextDocument, fromLine: number): string {
  for (let line = fromLine; line >= 0; line--) {
    const text = document.lineAt(line).text;
    const match = /^\s*\[([^\]]+)\]\s*$/.exec(text);
    if (match) {
      return match[1].trim().toLowerCase();
    }
  }
  return "";
}

function getHoverDependencyAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
): { name: string; range: vscode.Range } | null {
  const fileName = path.basename(document.uri.fsPath);
  const range = document.getWordRangeAtPosition(position, /[A-Za-z][A-Za-z0-9_.-]*/);
  if (!range) { return null; }

  const hovered = document.getText(range);
  const hoveredNorm = normaliseName(hovered);
  const line = document.lineAt(position.line).text;
  const noComment = line.split("#")[0] ?? "";
  const trimmed = noComment.trim();
  if (!trimmed) { return null; }

  if (/^requirements.*\.(txt|in)$/i.test(fileName)) {
    const match = /^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?\s*(?:[><=!~^].*)?$/.exec(trimmed);
    if (!match) { return null; }
    if (normaliseName(match[1]) !== hoveredNorm) { return null; }
    return { name: match[1], range };
  }

  if (fileName === "pyproject.toml") {
    const quoted = [...noComment.matchAll(/["']([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?[^"']*["']/g)];
    for (const m of quoted) {
      if (normaliseName(m[1]) === hoveredNorm && hoveredNorm !== "python") {
        return { name: m[1], range };
      }
    }

    const section = findNearestTomlSection(document, position.line);
    if (section.includes("dependencies")) {
      const keyMatch = /^\s*([A-Za-z0-9_.-]+)\s*=/.exec(noComment);
      if (keyMatch && normaliseName(keyMatch[1]) === hoveredNorm && hoveredNorm !== "python") {
        return { name: keyMatch[1], range };
      }
    }
  }

  return null;
}

function registerDependencyHoverProvider(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = [
    { scheme: "file", pattern: "**/requirements*.txt" },
    { scheme: "file", pattern: "**/requirements*.in" },
    { scheme: "file", pattern: "**/pyproject.toml" },
  ];

  const provider: vscode.HoverProvider = {
    provideHover: async (document, position) => {
      const target = getHoverDependencyAtPosition(document, position);
      if (!target) { return null; }

      try {
        const latest = await fetchLatestVersion(target.name);
        const args: QuickUpdateCommandArgs = {
          uri: document.uri.toString(),
          packageName: target.name,
          latest,
        };
        const commandUri = vscode.Uri.parse(
          `command:pylens.quickUpdateDependency?${encodeURIComponent(JSON.stringify(args))}`
        );

        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.appendMarkdown(`**PyLens**\n\nLatest: \`${latest}\`\n\n`);
        md.appendMarkdown(`[Quick Update to ${latest}](${commandUri.toString()})`);

        return new vscode.Hover(md, target.range);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch latest version";
        return new vscode.Hover(`PyLens: ${message}`, target.range);
      }
    },
  };

  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, provider));
}

// ── Export ────────────────────────────────────────────────────────────────────

async function exportJson(): Promise<void> {
  if (!lastResults) {
    vscode.window.showWarningMessage("PyLens: No scan results to export. Run a scan first.");
    return;
  }

  const data = lastResults.map((r) => ({
    name: r.name,
    currentVersion: r.version,
    rawSpec: r.rawSpec,
    latestVersion: r.latest,
    license: r.license,
    maintenance: r.maintenance,
    latestReleaseDate: r.latestReleaseDate,
    status: r.status,
    kind: r.kind,
    pypiUrl: r.pypiUrl,
    vulnerabilityCount: r.vulnerabilities?.length ?? null,
    vulnerabilities: r.vulnerabilities?.map((v) => ({
      id: v.id,
      summary: v.summary,
      link: v.link,
      fixedIn: v.fixedIn ?? [],
    })) ?? null,
    ...(r.error ? { error: r.error } : {}),
  }));

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file("pylens-report.json"),
    filters: { JSON: ["json"] },
  });

  if (uri) {
    fs.writeFileSync(uri.fsPath, JSON.stringify(data, null, 2), "utf8");
    vscode.window.showInformationMessage(`PyLens: Report exported to ${path.basename(uri.fsPath)}`);
  }
}

async function exportCsv(): Promise<void> {
  if (!lastResults) {
    vscode.window.showWarningMessage("PyLens: No scan results to export. Run a scan first.");
    return;
  }

  const header =
    "Package,Current Version,Raw Spec,Latest Version,License,Maintenance,Latest Release Date,Vulnerability Count,Vulnerability IDs,Status,Kind,PyPI URL\n";
  const rows = lastResults
    .map(
      (r) =>
        `"${r.name}","${r.version ?? ""}","${r.rawSpec}","${r.latest ?? ""}","${r.license ?? ""}","${r.maintenance}","${r.latestReleaseDate ?? ""}","${r.vulnerabilities?.length ?? ""}","${(r.vulnerabilities ?? []).map((v) => v.id).join("; ")}","${r.status}","${r.kind}","${r.pypiUrl}"`
    )
    .join("\n");

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file("pylens-report.csv"),
    filters: { CSV: ["csv"] },
  });

  if (uri) {
    fs.writeFileSync(uri.fsPath, header + rows, "utf8");
    vscode.window.showInformationMessage(`PyLens: Report exported to ${path.basename(uri.fsPath)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activate
// ─────────────────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  // ── Status bar item ──
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = "pylens.check";
  statusBarItem.text = "$(package) PyLens";
  statusBarItem.tooltip = "Click to scan Python packages";
  context.subscriptions.push(statusBarItem);

  // ── Sidebar provider ──
  sidebarProvider = new PyLensSidebarProvider(
    context.extensionUri,
    () => runScan(context),          // onScan
    () => {                           // onOpenFull
      if (lastResults && lastFile) {
        if (currentPanel) {
          currentPanel.reveal(vscode.ViewColumn.Beside);
        } else {
          runScan(context, lastFile);
        }
      } else {
        runScan(context);
      }
    },
    () => selectFile(context)         // onSelectFile
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PyLensSidebarProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // ── Commands ──
  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.check", () => runScan(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.refresh", () => {
      clearCache();
      return runScan(context, lastFile ?? undefined);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.selectFile", () => selectFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.exportJson", exportJson)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.exportCsv", exportCsv)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.runPostUpdateCommand", runPostUpdateCommandFromCommand)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.compileRequirementsIn", runRequirementsInCompileCommandFromCommand)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("pylens.quickUpdateDependency", (args) =>
      quickUpdateDependencyFromHover(context, args)
    )
  );

  registerDependencyHoverProvider(context);

  // ── File watcher — auto-refresh when dependency files change ──
  const watcher = vscode.workspace.createFileSystemWatcher(
    "{**/requirements*.txt,**/requirements*.in,**/pyproject.toml,**/uv.lock,**/Pipfile,**/Pipfile.lock}"
  );

  const debouncedRefresh = debounce(() => {
    if (lastResults) {
      // Only auto-refresh if we've already scanned
      clearCache();
      runScan(context, lastFile ?? undefined);
    }
  }, 2000);

  watcher.onDidChange(debouncedRefresh);
  watcher.onDidCreate(debouncedRefresh);
  watcher.onDidDelete(debouncedRefresh);
  context.subscriptions.push(watcher);

  // Show status bar
  statusBarItem.show();
}

export function deactivate() {
  lastResults = null;
  lastFile = null;
  currentPanel = null;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function debounce(fn: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(fn, delay);
  };
}
