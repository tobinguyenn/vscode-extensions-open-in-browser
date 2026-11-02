const assert = require('assert');
const { load } = require('./helpers');
// VS Code's product.json forces this extension to run on the UI (Windows) side,
// so in a WSL window it receives vscode-remote://wsl+<distro>/... resources.
module.exports = async () => {
  const opened = [];
  const remote = path => ({ scheme: 'vscode-remote', authority: 'wsl+ubuntu', path, fsPath: path.replace(/\//g, '\\') });
  const vscode = {
    workspace: { getConfiguration: () => ({ default: '', get: (key, fallback) => fallback }) },
    window: {
      activeTextEditor: { document: { uri: remote('/home/u/active.html') } },
      showQuickPick: () => Promise.resolve({ standardName: 'chrome' })
    }
  };
  const util = {
    open: (target, browser) => opened.push([target, browser]),
    defaultBrowser: () => '',
    standardizedBrowserName: () => '',
    browserItems: () => []
  };
  const index = load('index', { './util': util, vscode }, 'win32');

  index.openDefault(remote('/home/u/a b.html'));
  index.openDefault(undefined);
  index.openDefault(remote('/mnt/c/Users/x/i.html'));
  index.openBySpecify(remote('/home/u/a b.html'));
  await new Promise(resolve => setImmediate(resolve));

  // Local files and other remotes keep using fsPath.
  index.openDefault({ scheme: 'file', authority: '', path: '/c:/x.html', fsPath: 'c:\\x.html' });
  index.openDefault({ scheme: 'vscode-remote', authority: 'ssh-remote+host', path: '/srv/x.html', fsPath: '\\srv\\x.html' });

  assert.deepStrictEqual(opened, [
    ['\\\\wsl.localhost\\ubuntu\\home\\u\\a b.html', ''],
    ['\\\\wsl.localhost\\ubuntu\\home\\u\\active.html', ''],
    ['C:\\Users\\x\\i.html', ''],
    ['\\\\wsl.localhost\\ubuntu\\home\\u\\a b.html', 'chrome'],
    ['c:\\x.html', ''],
    ['\\srv\\x.html', '']
  ]);
};
