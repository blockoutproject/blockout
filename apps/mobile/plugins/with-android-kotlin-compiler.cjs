const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Makes Expo 57's Kotlin property select the compiler as well as the standard library.
 * The installed template otherwise resolves React Native's older compiler classpath
 * (expo/expo#49668). Repeated prebuilds preserve the replacement; a changed template
 * fails explicitly so an Expo upgrade cannot silently restore the incompatible compiler.
 * Remove this workaround when the upstream template honors android.kotlinVersion.
 * @type {import("expo/config-plugins").ConfigPlugin}
 */
module.exports = function withAndroidKotlinCompiler(config) {
  return withProjectBuildGradle(config, (mod) => {
    const original = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
    const configured =
      "classpath(\"org.jetbrains.kotlin:kotlin-gradle-plugin:${findProperty('android.kotlinVersion')}\")";
    const { contents } = mod.modResults;

    if (!contents.includes(original) && !contents.includes(configured)) {
      throw new Error(
        "Review the Expo Kotlin compiler workaround: the project build.gradle template changed.",
      );
    }

    mod.modResults.contents = contents.replace(original, configured);
    return mod;
  });
};
