const assert = require('assert');
const { load } = require('./helpers');
module.exports = async () => {
  const wsl = load('wsl', {}, 'linux');

  assert.strictEqual(wsl.isWsl('linux', { WSL_DISTRO_NAME: 'Ubuntu' }), true);
  assert.strictEqual(wsl.isWsl('linux', {}), false);
  assert.strictEqual(wsl.isWsl('win32', { WSL_DISTRO_NAME: 'Ubuntu' }), false);
  assert.strictEqual(wsl.isWsl('linux', { WSL_DISTRO_NAME: '' }), false);

  const cases = [
    ['/home/u/a b/index.html', '\\\\wsl.localhost\\Ubuntu\\home\\u\\a b\\index.html', 'file://wsl.localhost/Ubuntu/home/u/a%20b/index.html'],
    ['/home/u/a#b%.html', '\\\\wsl.localhost\\Ubuntu\\home\\u\\a#b%.html', 'file://wsl.localhost/Ubuntu/home/u/a%23b%25.html'],
    ['/home/u/文件.html', '\\\\wsl.localhost\\Ubuntu\\home\\u\\文件.html', 'file://wsl.localhost/Ubuntu/home/u/%E6%96%87%E4%BB%B6.html'],
    ['/mnt/c/Users/x/i.html', 'C:\\Users\\x\\i.html', 'file:///C:/Users/x/i.html'],
    ['/mnt/d/a b.html', 'D:\\a b.html', 'file:///D:/a%20b.html'],
    ['/mnt/c', 'C:\\', 'file:///C:/'],
    ['/mnt/wsl/x.html', '\\\\wsl.localhost\\Ubuntu\\mnt\\wsl\\x.html', 'file://wsl.localhost/Ubuntu/mnt/wsl/x.html'],
    ['/mnt/cd/x.html', '\\\\wsl.localhost\\Ubuntu\\mnt\\cd\\x.html', 'file://wsl.localhost/Ubuntu/mnt/cd/x.html']
  ];
  for (const [input, windowsPath, url] of cases) {
    assert.strictEqual(wsl.toWindowsPath(input, 'Ubuntu'), windowsPath, input);
    assert.strictEqual(wsl.toWindowsFileUrl(input, 'Ubuntu'), url, input);
  }
};
