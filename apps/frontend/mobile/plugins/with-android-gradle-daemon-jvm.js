const fs = require("node:fs/promises");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const DAEMON_JVM_CRITERIA = "toolchainVersion=21\n";

/**
 * Selects JDK 21 through Gradle's repository-owned daemon JVM criteria.
 */
function withAndroidGradleDaemonJvm(config) {
  return withDangerousMod(config, [
    "android",
    async (androidConfig) => {
      const gradleDirectory = path.join(
        androidConfig.modRequest.platformProjectRoot,
        "gradle",
      );

      await fs.mkdir(gradleDirectory, { recursive: true });
      await fs.writeFile(
        path.join(gradleDirectory, "gradle-daemon-jvm.properties"),
        DAEMON_JVM_CRITERIA,
        "utf8",
      );

      return androidConfig;
    },
  ]);
}

module.exports = withAndroidGradleDaemonJvm;
