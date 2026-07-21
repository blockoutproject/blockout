const {getDefaultConfig} = require("@expo/metro-config");
const {withNxMetro} = require("@nx/expo");

module.exports = withNxMetro(getDefaultConfig(__dirname), {
  debug: false,
  extensions: [],
  watchFolders: [],
});
