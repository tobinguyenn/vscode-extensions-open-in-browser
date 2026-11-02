"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openBySpecify = exports.openDefault = void 0;
const util_1 = require("./util");
const vscode = require("vscode");
const wsl_1 = require("./wsl");
function currentPageUri() {
    return vscode.window.activeTextEditor
        && vscode.window.activeTextEditor.document
        && vscode.window.activeTextEditor.document.uri;
}
const WSL_AUTHORITY = /^wsl\+(.+)$/i;
/**
 * Path the browser host can open. VS Code's product.json runs this extension on
 * the UI (Windows) side, so in a WSL window resources arrive as
 * vscode-remote://wsl+<distro>/... and fsPath alone loses the distro.
 */
function localPath(uri) {
    if (!uri) {
        return undefined;
    }
    const wsl = uri.scheme === 'vscode-remote' && WSL_AUTHORITY.exec(uri.authority || '');
    return wsl ? (0, wsl_1.toWindowsPath)(uri.path, wsl[1]) : uri.fsPath;
}
/**
 * open default browser
 * if you have specified browser in configuration file,
 * the browser you specified will work.
 * else the system default browser will work.
 */
const openDefault = (path) => {
    const uri = localPath(path || currentPageUri());
    const browser = (0, util_1.standardizedBrowserName)((0, util_1.defaultBrowser)());
    (0, util_1.open)(uri, browser);
};
exports.openDefault = openDefault;
/**
 * open specify browser
 */
const openBySpecify = (path) => {
    vscode.window.showQuickPick((0, util_1.browserItems)()).then(item => {
        if (!item) {
            return;
        }
        const uri = localPath(path || currentPageUri());
        (0, util_1.open)(uri, item.standardName);
    });
};
exports.openBySpecify = openBySpecify;
//# sourceMappingURL=index.js.map