'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Tests must not inherit the developer's WSL environment, or Linux tests run
// on a WSL machine would take the WSL launch path.
const isolatedEnv = () => {
  const env = Object.assign({}, process.env);
  delete env.WSL_DISTRO_NAME;
  delete env.WSL_INTEROP;
  return env;
};

exports.load = (file, mocks = {}, platform = process.platform, env = isolatedEnv()) => {
  if (mocks.vscode) {
    mocks.vscode = Object.assign({ workspace: { getConfiguration: () => ({ get: (key, fallback) => fallback }) } }, mocks.vscode);
  }
  const module = { exports: {} };
  const filename = path.resolve(__dirname, '../out', file + '.js');
  const sandbox = {
    module, exports: module.exports, console: mocks.console || console, Buffer,
    process: { platform, env },
    require: name => Object.prototype.hasOwnProperty.call(mocks, name) ? mocks[name] : require(name.startsWith('.') ? path.resolve(path.dirname(filename), name) : name)
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return module.exports;
};
