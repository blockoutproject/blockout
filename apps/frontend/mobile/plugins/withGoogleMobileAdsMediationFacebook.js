const {withAppBuildGradle, withPodfile} = require("expo/config-plugins");

const withGoogleMobileAdsMediationFacebook = (config) => {
  config = withPodfile(config, (c) => {
    const line = "pod 'GoogleMobileAdsMediationFacebook'";
    if (!c.modResults.contents.includes(line)) {
      const i = c.modResults.contents.indexOf("use_expo_modules!");
      if (i !== -1) {
        const j = c.modResults.contents.indexOf("\n", i);
        const k = j === -1 ? c.modResults.contents.length : j + 1;
        c.modResults.contents =
          c.modResults.contents.slice(0, k) + `  ${line}\n` + c.modResults.contents.slice(k);
      } else {
        c.modResults.contents = c.modResults.contents + `\n${line}\n`;
      }
    }
    return c;
  });

  config = withAppBuildGradle(config, (c) => {
    const dep = 'implementation "com.google.ads.mediation:facebook:6.21.0.0"';
    const r = /dependencies\s*\{([\s\S]*?)\n\}/m;
    const m = c.modResults.contents.match(r);
    if (m && !m[1].includes(dep)) {
      c.modResults.contents = c.modResults.contents.replace(
        r,
        `dependencies {${m[1]}\n    ${dep}\n}`
      );
    }
    return c;
  });

  return config;
};

module.exports = withGoogleMobileAdsMediationFacebook;
