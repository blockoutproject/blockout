const { withAppBuildGradle } = require("expo/config-plugins");

const configuration = `
// Expo Dev Launcher's discovery uses java.time on the supported API 24 floor.
android {
    compileOptions {
        coreLibraryDesugaringEnabled true
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}
`;

/**
 * Supplies Android's standard Java API compatibility library through Expo prebuild.
 * Expo 57's build-properties plugin exposes no desugaring option. Repeated prebuilds
 * retain one configuration block without patching dependency sources.
 * @type {import("expo/config-plugins").ConfigPlugin}
 */
module.exports = function withAndroidDesugaring(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(configuration)) {
      mod.modResults.contents += `\n${configuration}`;
    }
    return mod;
  });
};
