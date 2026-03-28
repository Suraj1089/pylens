"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Sidebar — WebviewViewProvider for the Activity Bar panel
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
exports.PyLensSidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
const webview_1 = require("./webview");
class PyLensSidebarProvider {
    constructor(_extensionUri, _onScan, _onOpenFull, _onSelectFile) {
        this._extensionUri = _extensionUri;
        this._onScan = _onScan;
        this._onOpenFull = _onOpenFull;
        this._onSelectFile = _onSelectFile;
        this._stats = null;
        this._isScanning = false;
    }
    resolveWebviewView(webviewView, _context, _token) {
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
        const autoScan = vscode.workspace.getConfiguration("pylens").get("autoScanOnOpen", false);
        if (autoScan && !this._stats) {
            this._onScan();
        }
    }
    /** Update the sidebar with new stats */
    updateStats(stats) {
        this._stats = stats;
        this._isScanning = false;
        this._updateHtml();
    }
    /** Show scanning state */
    setScanning(scanning) {
        this._isScanning = scanning;
        this._updateHtml();
    }
    _updateHtml() {
        if (!this._view) {
            return;
        }
        this._view.webview.html = (0, webview_1.buildSidebarHtml)(this._stats, this._isScanning);
    }
}
exports.PyLensSidebarProvider = PyLensSidebarProvider;
PyLensSidebarProvider.viewType = "pylens-sidebar";
//# sourceMappingURL=sidebar.js.map