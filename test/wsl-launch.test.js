const assert = require('assert');
const { EventEmitter } = require('events');
const { load } = require('./helpers');
module.exports = async () => {
  const env = { WSL_DISTRO_NAME: 'Ubuntu' };
  const calls = [];
  const messages = [];
  let reject;
  const vscode = {
    workspace: { getConfiguration: () => ({ get: (key, fallback) => key === 'arguments' ? { chrome: ['--incognito'] } : fallback }) },
    window: { showErrorMessage: message => messages.push(message) }
  };
  const config = load('config', {}, 'linux', env);
  const util = load('util', {
    './config': config, vscode,
    console: { error: () => {} },
    opn: () => { throw new Error('opn must not be called in WSL'); },
    './windows': { openWindows: (target, browser, args, executable) => {
      calls.push([target, browser, Array.from(args), executable]);
      return reject ? Promise.reject(reject) : Promise.resolve();
    } }
  }, 'linux', env);

  await util.open('/home/u/a b.html', '');
  await util.open('/home/u/a b.html', 'chrome');
  await util.open('/mnt/c/x/i.html', 'msedge');
  assert.deepStrictEqual(calls, [
    ['\\\\wsl.localhost\\Ubuntu\\home\\u\\a b.html', '', [], 'powershell.exe'],
    ['file://wsl.localhost/Ubuntu/home/u/a%20b.html', 'chrome', ['--incognito'], 'powershell.exe'],
    ['file:///C:/x/i.html', 'msedge', [], 'powershell.exe']
  ]);
  assert.strictEqual(messages.length, 0);

  // WSL interop unavailable: powershell.exe cannot be spawned.
  reject = Object.assign(new Error('spawn powershell.exe ENOENT'), { code: 'ENOENT' });
  await util.open('/home/u/a.html', '');
  assert.strictEqual(messages.pop(),
    'Open browser failed: cannot run powershell.exe from WSL. Check that WSL interop is enabled and Windows paths are on PATH.');

  // powershell.exe not on PATH (appendWindowsPath=false) but interop works:
  // retry with the default drive-mount location, no error shown.
  reject = undefined;
  const fallback = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
  const onlyFallback = load('util', {
    './config': config, vscode,
    console: { error: () => {} },
    opn: () => { throw new Error('opn must not be called in WSL'); },
    './windows': { openWindows: (target, browser, args, executable) => {
      calls.push([target, browser, Array.from(args), executable]);
      return executable === fallback ? Promise.resolve()
        : Promise.reject(Object.assign(new Error('spawn powershell.exe ENOENT'), { code: 'ENOENT' }));
    } }
  }, 'linux', env);
  calls.length = 0;
  await onlyFallback.open('/home/u/a.html', '');
  assert.deepStrictEqual(calls.map(call => call[3]), ['powershell.exe', fallback]);
  assert.strictEqual(messages.length, 0);

  // A Linux absolute custom path still goes to the Windows launcher and gets the generic error.
  reject = new Error('Start-Process failed');
  await util.open('/home/u/a.html', '/usr/bin/firefox');
  assert.strictEqual(calls[calls.length - 1][1], '/usr/bin/firefox');
  assert.match(messages.pop(), /Please check if you have installed the browser \/usr\/bin\/firefox correctly/);

  // openWindows spawns the executable it is given.
  let command;
  const launcher = load('windows', { child_process: { spawn: cmd => {
    command = cmd;
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    setImmediate(() => child.emit('close', 0));
    return child;
  } } }, 'linux', env);
  await launcher.openWindows('x', '', [], 'powershell.exe');
  assert.strictEqual(command, 'powershell.exe');
};
