import * as vscode from "vscode";
import { SidebarStats } from "./webview";
export declare class PyLensSidebarProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri;
    private readonly _onScan;
    private readonly _onOpenFull;
    private readonly _onSelectFile;
    static readonly viewType = "pylens-sidebar";
    private _view?;
    private _stats;
    private _isScanning;
    constructor(_extensionUri: vscode.Uri, _onScan: () => void, _onOpenFull: () => void, _onSelectFile: () => void);
    resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /** Update the sidebar with new stats */
    updateStats(stats: SidebarStats | null): void;
    /** Show scanning state */
    setScanning(scanning: boolean): void;
    private _updateHtml;
}
//# sourceMappingURL=sidebar.d.ts.map