const { withAppBuildGradle } = require("expo/config-plugins");

const FACEBOOK_MEDIATION_DEPENDENCY =
  'implementation "com.google.ads.mediation:facebook:6.21.0.1"';

/**
 * Adds the Android Meta mediation adapter to Expo's generated app module.
 */
function withGoogleMobileAdsMediationFacebook(config) {
  return withAppBuildGradle(config, (buildGradleConfig) => {
    const { contents } = buildGradleConfig.modResults;
    if (contents.includes(FACEBOOK_MEDIATION_DEPENDENCY)) {
      return buildGradleConfig;
    }

    const dependenciesBlock = "dependencies {";
    const blockIndex = contents.indexOf(dependenciesBlock);
    if (blockIndex === -1) {
      throw new Error(
        "Unable to locate the Android app dependencies block for Meta mediation.",
      );
    }

    const insertionIndex = blockIndex + dependenciesBlock.length;
    buildGradleConfig.modResults.contents =
      contents.slice(0, insertionIndex) +
      `\n    ${FACEBOOK_MEDIATION_DEPENDENCY}` +
      contents.slice(insertionIndex);

    return buildGradleConfig;
  });
}

module.exports = withGoogleMobileAdsMediationFacebook;
