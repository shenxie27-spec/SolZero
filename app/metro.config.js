const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(root, 'core', 'node_modules'),
      path.resolve(root, 'node_modules')
    ]
  }
};

module.exports = mergeConfig(defaultConfig, config);