import Config from './config';
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { openWindows } from './windows';
import { win32, posix } from 'path';
import { isWsl, toWindowsPath, toWindowsFileUrl } from './wsl';

const opn = require('opn');

const WSL_POWERSHELL_FALLBACK = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const inWsl = () => isWsl(process.platform, process.env);
/** Browser paths are Windows paths on Windows and in WSL (the browser runs on the host). */
const browserPathApi = () => process.platform === 'win32' || inWsl() ? win32 : posix;

/**
 * get standardized browser name
 * @param name String
 */
const builtInBrowserName = (name: string = ''): string => {
  if (browserPathApi().isAbsolute(name)) {
    return name;
  }
  const _name = name.toLowerCase();
  if (process.platform === 'linux' && !inWsl() &&
      ['chromium-browser', 'google-chrome-stable'].indexOf(_name) !== -1) {
    return _name;
  }
  const browser = Config.browsers.find(item => {
    return item.acceptName.indexOf(_name) !== -1;
  });

  return browser ? browser.standardName : '';
};

interface CustomBrowser {
  displayName: string;
  name?: string;
  path?: string;
}

/** Read on demand so settings changes are reflected without reloading. */
export const browserItems = () => {
  const configured = vscode.workspace.getConfiguration(Config.app)
    .get<CustomBrowser[]>('customBrowsers', []);
  const custom = (Array.isArray(configured) ? configured : []).filter(item => {
    if (!item || typeof item.displayName !== 'string' || !item.displayName.trim()) {
      return false;
    }
    if (item.name !== undefined && item.path === undefined) {
      return typeof item.name === 'string' && !!item.name.trim();
    }
    return item.name === undefined && typeof item.path === 'string'
      && browserPathApi().isAbsolute(item.path);
  }).map(item => ({
    label: item.displayName.trim(),
    standardName: item.path || builtInBrowserName(item.name!.trim()) || item.name!.trim(),
    acceptName: item.name ? [item.name.trim()] : []
  }));
  return [...Config.browsers, ...custom];
};

export const standardizedBrowserName = (name: string = ''): string => {
  const builtIn = builtInBrowserName(name);
  if (builtIn) {
    return builtIn;
  }
  const browser = browserItems().find(item => item.standardName === name
    || item.acceptName.indexOf(name) !== -1);
  return browser ? browser.standardName : '';
};

/**
 * get default browser name
 */
export const defaultBrowser = (): string => {
  const config = vscode.workspace.getConfiguration(Config.app);
  return config ? config.default : '';
};

export const open = (path: string, browser: string = '') => {
  const configuredArgs = vscode.workspace.getConfiguration(Config.app)
    .get<{ [name: string]: string[] }>('arguments', {});
  const key = browser && configuredArgs && Object.keys(configuredArgs)
    .find(name => standardizedBrowserName(name) === browser);
  const appArgs = key && Array.isArray(configuredArgs[key])
    && configuredArgs[key].every(value => typeof value === 'string') ? configuredArgs[key] : [];
  const wsl = inWsl();
  const distro = process.env.WSL_DISTRO_NAME as string;
  // In WSL the browser runs on the Windows host: launch it through PowerShell
  // interop with a path Windows can reach.
  const wslTarget = wsl ? (browser ? toWindowsFileUrl(path, distro) : toWindowsPath(path, distro)) : '';
  const launch = wsl
    // powershell.exe is missing from PATH when appendWindowsPath=false; interop
    // may still work, so retry from the default drive mount.
    ? openWindows(wslTarget, browser, appArgs, 'powershell.exe')
        .catch(error => error && error.code === 'ENOENT'
          ? openWindows(wslTarget, browser, appArgs, WSL_POWERSHELL_FALLBACK)
          : Promise.reject(error))
    : process.platform === 'darwin'
    ? new Promise<void>((resolve, reject) => {
        const executable = posix.isAbsolute(browser) && !/\.app\/?$/i.test(browser);
        const args = executable ? [...appArgs, path]
          : (browser ? ['-a', browser, path] : [path]);
        if (!executable && appArgs.length) {
          args.push('--args', ...appArgs);
        }
        const child = spawn(executable ? browser : '/usr/bin/open', args);
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve()
          : reject(new Error(`open exited with code ${code}`)));
      })
    : (process.platform === 'win32' ? openWindows(browser ? vscode.Uri.file(path).toString() : path, browser, appArgs)
      : opn(path, { app: browser ? [browser, ...appArgs] : undefined }));
  return launch.catch(error => {
      console.error('[open-in-browser]', error);
      if (wsl && error && error.code === 'ENOENT') {
        vscode.window.showErrorMessage('Open browser failed: cannot run powershell.exe from WSL. Check that WSL interop is enabled and Windows paths are on PATH.');
        return;
      }
      vscode.window.showErrorMessage(`Open browser failed!! Please check if you have installed the browser ${browser} correctly!`);
    });
};
