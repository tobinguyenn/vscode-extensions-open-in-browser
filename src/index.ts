import { open, defaultBrowser, standardizedBrowserName, browserItems } from './util';
import * as vscode from 'vscode';
import { toWindowsPath } from './wsl';

function currentPageUri () {
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
function localPath (uri: any): string | undefined {
  if (!uri) {
    return undefined;
  }
  const wsl = uri.scheme === 'vscode-remote' && WSL_AUTHORITY.exec(uri.authority || '');
  return wsl ? toWindowsPath(uri.path, wsl[1]) : uri.fsPath;
}

/** 
 * open default browser
 * if you have specified browser in configuration file, 
 * the browser you specified will work.
 * else the system default browser will work.
 */
export const openDefault = (path: any): void => {
  const uri = localPath(path || currentPageUri());
  const browser = standardizedBrowserName(defaultBrowser());
  open(uri, browser);
};

/** 
 * open specify browser
 */
export const openBySpecify = (path: any): void => {
  vscode.window.showQuickPick(
    browserItems()
  ).then(item => {
    if (!item) {
      return;
    }
    const uri = localPath(path || currentPageUri());
    open(uri, item.standardName);
  });
};
