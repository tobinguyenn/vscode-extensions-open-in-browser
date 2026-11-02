const assert = require('assert');
const { load } = require('./helpers');
module.exports = async () => {
  const env = { WSL_DISTRO_NAME: 'Ubuntu' };
  const customBrowsers = [{ displayName: 'Portable', path: 'C:\\Portable\\firefox.exe' }];
  const vscode = {
    workspace: { getConfiguration: () => ({ get: (key, fallback) => key === 'customBrowsers' ? customBrowsers : fallback }) }
  };
  const config = load('config', {}, 'linux', env);
  const util = load('util', { './config': config, vscode }, 'linux', env);

  assert.deepStrictEqual(Array.from(config.default.browsers.map(b => b.label)),
    ['Google Chrome', 'Mozilla Firefox', 'Opera', 'Brave', 'Microsoft Edge']);
  assert.deepStrictEqual(Array.from(config.default.browsers.map(b => b.standardName)),
    ['chrome', 'firefox', 'opera', 'brave', 'msedge']);
  assert.strictEqual(util.standardizedBrowserName('google-chrome'), 'chrome');
  // The Linux-only command names do not exist on the Windows host.
  assert.strictEqual(util.standardizedBrowserName('google-chrome-stable'), '');
  assert.strictEqual(util.standardizedBrowserName('C:\\Tools\\chrome.exe'), 'C:\\Tools\\chrome.exe');
  assert.ok(util.browserItems().some(item => item.label === 'Portable' && item.standardName === 'C:\\Portable\\firefox.exe'));

  // Plain Linux is unchanged.
  const linux = load('config', {}, 'linux', {});
  assert.deepStrictEqual(Array.from(linux.default.browsers.map(b => b.standardName)),
    ['google-chrome', 'firefox', 'opera', 'brave-browser', 'chromium', 'microsoft-edge']);
};
