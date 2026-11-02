"use strict";
/**
 * Helpers for running the extension host inside WSL while the browser runs
 * on the Windows host. Pure functions: callers pass platform and env.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWindowsFileUrl = exports.toWindowsPath = exports.isWsl = void 0;
const DRIVE_MOUNT = /^\/mnt\/([a-zA-Z])(?:\/|$)/;
const isWsl = (platform, env) => platform === 'linux' && !!env.WSL_DISTRO_NAME;
exports.isWsl = isWsl;
const segments = (linuxPath) => linuxPath.split('/').filter(Boolean);
/** Windows path for a WSL file: `C:\...` for drive mounts, `\\wsl.localhost\<distro>\...` otherwise. */
const toWindowsPath = (linuxPath, distro) => {
    const drive = DRIVE_MOUNT.exec(linuxPath);
    if (drive) {
        return drive[1].toUpperCase() + ':\\' + segments(linuxPath).slice(2).join('\\');
    }
    return '\\\\wsl.localhost\\' + distro + '\\' + segments(linuxPath).join('\\');
};
exports.toWindowsPath = toWindowsPath;
/** file URL for a WSL file: `file:///C:/...` for drive mounts, `file://wsl.localhost/<distro>/...` otherwise. */
const toWindowsFileUrl = (linuxPath, distro) => {
    const drive = DRIVE_MOUNT.exec(linuxPath);
    if (drive) {
        return 'file:///' + drive[1].toUpperCase() + ':/'
            + segments(linuxPath).slice(2).map(encodeURIComponent).join('/');
    }
    return 'file://wsl.localhost/' + [distro, ...segments(linuxPath)].map(encodeURIComponent).join('/');
};
exports.toWindowsFileUrl = toWindowsFileUrl;
//# sourceMappingURL=wsl.js.map