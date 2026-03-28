// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — WebviewViewProvider for the Activity Bar panel
// ─────────────────────────────────────────────────────────────────────────────

import * as vscode from "vscode";
import { SidebarStats, buildSidebarHtml } from "./webview";

export class PyLensSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "pylens-sidebar";

  private _view?: vscode.WebviewView;
  private _stats: SidebarStats | null = null;
  private _isScanning = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _onScan: () => void,
    private readonly _onOpenFull: () => void,
    private readonly _onSelectFile: () => void
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.onDidReceiveMessage((msg) => {
      switch (msg.type) {
        case "scan":
          this._onScan();
          break;
        case "openFull":
          this._onOpenFull();
          break;
        case "selectFile":
          this._onSelectFile();
          break;
      }
    });

    this._updateHtml();

    // Auto-scan on open if configured
    const autoScan = vscode.workspace.getConfiguration("pylens").get<boolean>("autoScanOnOpen", false);
    if (autoScan && !this._stats) {
      this._onScan();
    }
  }

  /** Update the sidebar with new stats */
  public updateStats(stats: SidebarStats | null): void {
    this._stats = stats;
    this._isScanning = false;
    this._updateHtml();
  }

  /** Show scanning state */
  public setScanning(scanning: boolean): void {
    this._isScanning = scanning;
    this._updateHtml();
  }

  private _updateHtml(): void {
    if (!this._view) { return; }
    this._view.webview.html = buildSidebarHtml(this._stats, this._isScanning);
  }
}
