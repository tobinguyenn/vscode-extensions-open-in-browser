/**
 * Helpers for running the extension host inside WSL while the browser runs
 * on the Windows host. Pure functions: callers pass platform and env.
 */

const DRIVE_MOUNT = /^\/mnt\/([a-zA-Z])(?:\/|$)/;

export const isWsl = (platform: string, env: { [key: string]: string | undefined }): boolean =>
  platform === 'linux' && !!env.WSL_DISTRO_NAME;

const segments = (linuxPath: string): string[] => linuxPath.split('/').filter(Boolean);

/** Windows path for a WSL file: `C:\...` for drive mounts, `\\wsl.localhost\<distro>\...` otherwise. */
export const toWindowsPath = (linuxPath: string, distro: string): string => {
  const drive = DRIVE_MOUNT.exec(linuxPath);
  if (drive) {
    return drive[1].toUpperCase() + ':\\' + segments(linuxPath).slice(2).join('\\');
  }
  return '\\\\wsl.localhost\\' + distro + '\\' + segments(linuxPath).join('\\');
};

/** file URL for a WSL file: `file:///C:/...` for drive mounts, `file://wsl.localhost/<distro>/...` otherwise. */
export const toWindowsFileUrl = (linuxPath: string, distro: string): string => {
  const drive = DRIVE_MOUNT.exec(linuxPath);
  if (drive) {
    return 'file:///' + drive[1].toUpperCase() + ':/'
      + segments(linuxPath).slice(2).map(encodeURIComponent).join('/');
  }
  return 'file://wsl.localhost/' + [distro, ...segments(linuxPath)].map(encodeURIComponent).join('/');
};
