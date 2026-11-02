"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.open = exports.defaultBrowser = exports.standardizedBrowserName = exports.browserItems = void 0;
const config_1 = require("./config");
const vscode = require("vscode");
const child_process_1 = require("child_process");
const windows_1 = require("./windows");
const path_1 = require("path");
const wsl_1 = require("./wsl");
const opn = require('opn');
const WSL_POWERSHELL_FALLBACK = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const inWsl = () => (0, wsl_1.isWsl)(process.platform, process.env);
/** Browser paths are Windows paths on Windows and in WSL (the browser runs on the host). */
const browserPathApi = () => process.platform === 'win32' || inWsl() ? path_1.win32 : path_1.posix;
/**
 * get standardized browser name
 * @param name String
 */
const builtInBrowserName = (name = '') => {
    if (browserPathApi().isAbsolute(name)) {
        return name;
    }
    const _name = name.toLowerCase();
    if (process.platform === 'linux' && !inWsl() &&
        ['chromium-browser', 'google-chrome-stable'].indexOf(_name) !== -1) {
        return _name;
    }
    const browser = config_1.default.browsers.find(item => {
        return item.acceptName.indexOf(_name) !== -1;
    });
    return browser ? browser.standardName : '';
};
/** Read on demand so settings changes are reflected without reloading. */
const browserItems = () => {
    const configured = vscode.workspace.getConfiguration(config_1.default.app)
        .get('customBrowsers', []);
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
        standardName: item.path || builtInBrowserName(item.name.trim()) || item.name.trim(),
        acceptName: item.name ? [item.name.trim()] : []
    }));
    return [...config_1.default.browsers, ...custom];
};
exports.browserItems = browserItems;
const standardizedBrowserName = (name = '') => {
    const builtIn = builtInBrowserName(name);
    if (builtIn) {
        return builtIn;
    }
    const browser = (0, exports.browserItems)().find(item => item.standardName === name
        || item.acceptName.indexOf(name) !== -1);
    return browser ? browser.standardName : '';
};
exports.standardizedBrowserName = standardizedBrowserName;
/**
 * get default browser name
 */
const defaultBrowser = () => {
    const config = vscode.workspace.getConfiguration(config_1.default.app);
    return config ? config.default : '';
};
exports.defaultBrowser = defaultBrowser;
const open = (path, browser = '') => {
    const configuredArgs = vscode.workspace.getConfiguration(config_1.default.app)
        .get('arguments', {});
    const key = browser && configuredArgs && Object.keys(configuredArgs)
        .find(name => (0, exports.standardizedBrowserName)(name) === browser);
    const appArgs = key && Array.isArray(configuredArgs[key])
        && configuredArgs[key].every(value => typeof value === 'string') ? configuredArgs[key] : [];
    const wsl = inWsl();
    const distro = process.env.WSL_DISTRO_NAME;
    // In WSL the browser runs on the Windows host: launch it through PowerShell
    // interop with a path Windows can reach.
    const wslTarget = wsl ? (browser ? (0, wsl_1.toWindowsFileUrl)(path, distro) : (0, wsl_1.toWindowsPath)(path, distro)) : '';
    const launch = wsl
        // powershell.exe is missing from PATH when appendWindowsPath=false; interop
        // may still work, so retry from the default drive mount.
        ? (0, windows_1.openWindows)(wslTarget, browser, appArgs, 'powershell.exe')
            .catch(error => error && error.code === 'ENOENT'
            ? (0, windows_1.openWindows)(wslTarget, browser, appArgs, WSL_POWERSHELL_FALLBACK)
            : Promise.reject(error))
        : process.platform === 'darwin'
            ? new Promise((resolve, reject) => {
                const executable = path_1.posix.isAbsolute(browser) && !/\.app\/?$/i.test(browser);
                const args = executable ? [...appArgs, path]
                    : (browser ? ['-a', browser, path] : [path]);
                if (!executable && appArgs.length) {
                    args.push('--args', ...appArgs);
                }
                const child = (0, child_process_1.spawn)(executable ? browser : '/usr/bin/open', args);
                child.once('error', reject);
                child.once('close', code => code === 0 ? resolve()
                    : reject(new Error(`open exited with code ${code}`)));
            })
            : (process.platform === 'win32' ? (0, windows_1.openWindows)(browser ? vscode.Uri.file(path).toString() : path, browser, appArgs)
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
exports.open = open;
//# sourceMappingURL=util.js.map