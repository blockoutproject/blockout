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
 * Exceptional workaround for Expo Dev Launcher 57.0.21's API 24 startup crash.
 * BuildProperties 57.0.22 exposes no desugaring option, so this mod adds Android's
 * standard compatibility configuration to app Gradle, once across prebuilds.
 * It affects all Android variants; a production need has not been established.
 * Reassess on Expo upgrades and remove after the documented unpatched API 24 check.
 * @see ../../../specs/003-shared-quality/research.md#native-ui-projection-and-system-appearance
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
