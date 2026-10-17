const {
  AndroidConfig,
  CodeGenerator,
  withAndroidManifest,
  withAppDelegate,
  withInfoPlist,
  withMainApplication,
} = require("expo/config-plugins");

// Native SDK callbacks run before native reports leave the device; JS beforeSend cannot filter them.
const androidInitialization = `
    // Blockout native crash privacy.
    if (!BuildConfig.DEBUG) {
      io.sentry.android.core.SentryAndroid.init(this) { options ->
        if (options.dsn == null) options.dsn = ""
        options.isSendDefaultPii = false
        options.isEnableAutoSessionTracking = false
        options.isEnableAutoActivityLifecycleTracing = false
        // NDK minidumps bypass the event filter.
        options.isEnableNdk = false
        options.isAnrEnabled = false
        options.maxBreadcrumbs = 0
        // Keep React Native's ordinary suppression of JavaScript rethrows.
        options.addIgnoredExceptionForType(com.facebook.react.common.JavascriptException::class.java)
        options.setBeforeSend { event, hint ->
          // Cached JS envelopes already passed the JS filter; preserve their bundle coordinates.
          if (event.platform == "javascript") return@setBeforeSend event
          hint.clearAttachments()
          val safe = io.sentry.SentryEvent(event.timestamp)
          safe.eventId = event.eventId
          safe.level = event.level
          safe.platform = event.platform
          safe.release = event.release
          safe.dist = event.dist
          safe.environment = event.environment
          safe.sdk = event.sdk
          safe.debugMeta = event.debugMeta
          safe.exceptions = event.exceptions
          safe.threads = event.threads
          event.exceptions?.forEach { failure ->
            failure.value = null
            failure.mechanism?.description = null
            failure.mechanism?.helpLink = null
            failure.mechanism?.data = null
            failure.mechanism?.meta = null
            failure.mechanism?.unknown = null
            failure.unknown = null
          }
          event.threads?.forEach { thread ->
            thread.name = null
            thread.unknown = null
          }
          val stacks = (event.exceptions?.mapNotNull { it.stacktrace } ?: emptyList()) +
            (event.threads?.mapNotNull { it.stacktrace } ?: emptyList())
          stacks.forEach { stack ->
            stack.unknown = null
            stack.registers = null
            stack.frames?.forEach { frame ->
              frame.vars = null
              frame.preContext = null
              frame.postContext = null
              frame.contextLine = null
              frame.filename = null
              frame.absPath = null
              frame.unknown = null
            }
          }
          safe
        }
      }
    }
`;

const iosInitialization = `
    // Blockout native crash privacy.
    #if !DEBUG
    if let dsn = Bundle.main.object(forInfoDictionaryKey: "SentryDSN") as? String, !dsn.isEmpty {
      SentrySDK.start { options in
        options.dsn = dsn
        if let environment = Bundle.main.object(forInfoDictionaryKey: "SentryEnvironment") as? String {
          options.environment = environment
        }
        options.sendDefaultPii = false
        options.enableAutoSessionTracking = false
        options.enableAutoPerformanceTracing = false
        options.enableAppHangTracking = false
        options.maxBreadcrumbs = 0
        options.beforeSend = { event in
          if event.platform == "javascript" { return event }
          // React Native rethrows were already captured in JS; their native names can embed messages.
          if event.exceptions?.contains(where: {
            $0.type.contains("Unhandled JS Exception") ||
              $0.value.contains("ExceptionsManager.reportException")
          }) == true { return nil }
          let safe = Sentry.Event(level: event.level)
          safe.eventId = event.eventId
          safe.timestamp = event.timestamp
          safe.platform = event.platform
          safe.releaseName = event.releaseName
          safe.dist = event.dist
          safe.environment = event.environment
          safe.sdk = event.sdk
          safe.debugMeta = event.debugMeta
          safe.debugMeta?.forEach { image in
            image.name = image.name.flatMap { URL(string: $0)?.lastPathComponent }
            image.codeFile = image.codeFile.flatMap { URL(string: $0)?.lastPathComponent }
          }
          safe.exceptions = event.exceptions
          safe.threads = event.threads
          safe.stacktrace = event.stacktrace
          event.exceptions?.forEach { failure in
            failure.value = "Native failure"
            failure.mechanism?.desc = nil
            failure.mechanism?.helpLink = nil
            failure.mechanism?.data = nil
            failure.mechanism?.meta = nil
          }
          event.threads?.forEach { thread in
            thread.name = nil
          }
          let stacks = (event.exceptions?.compactMap { $0.stacktrace } ?? []) +
            (event.threads?.compactMap { $0.stacktrace } ?? []) + [event.stacktrace].compactMap { $0 }
          stacks.forEach { stack in
            stack.registers = [:]
            stack.frames.forEach { frame in
              frame.vars = nil
              frame.preContext = nil
              frame.postContext = nil
              frame.contextLine = nil
              frame.fileName = nil
              frame.package = nil
            }
          }
          return safe
        }
      }
    }
    #endif
`;

/**
 * Installs the platform SDK privacy callbacks through Expo's generated application entrypoints.
 * @param {import('expo/config').ExpoConfig} config application configuration
 * @param {{dsn: string, environment: string | undefined}} options public runtime destination and environment
 * @returns {import('expo/config').ExpoConfig} configuration with native privacy wiring
 */
module.exports = function withSentryPrivacy(config, { dsn, environment }) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.SentryDSN = dsn;
    if (environment) mod.modResults.SentryEnvironment = environment;
    else delete mod.modResults.SentryEnvironment;
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      mod.modResults,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      "io.sentry.auto-init",
      "false",
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      app,
      "io.sentry.dsn",
      dsn,
    );
    if (environment) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        app,
        "io.sentry.environment",
        environment,
      );
    } else {
      AndroidConfig.Manifest.removeMetaDataItemFromMainApplication(
        app,
        "io.sentry.environment",
      );
    }
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    if (mod.modResults.language !== "kt")
      throw new Error("Sentry privacy requires the Expo Kotlin entrypoint");
    mod.modResults.contents = CodeGenerator.mergeContents({
      src: mod.modResults.contents,
      newSrc: androidInitialization,
      tag: "blockout-sentry-privacy",
      anchor: /super\.onCreate\(\)/,
      offset: 1,
      comment: "//",
    }).contents;
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift")
      throw new Error("Sentry privacy requires the Expo Swift entrypoint");
    mod.modResults.contents = CodeGenerator.mergeContents({
      src: mod.modResults.contents,
      newSrc: "import Sentry",
      tag: "blockout-sentry-import",
      anchor: /^(?:internal )?import Expo$/,
      offset: 1,
      comment: "//",
    }).contents;
    mod.modResults.contents = CodeGenerator.mergeContents({
      src: mod.modResults.contents,
      newSrc: iosInitialization,
      tag: "blockout-sentry-privacy",
      anchor: /let delegate = ReactNativeDelegate\(\)/,
      offset: 0,
      comment: "//",
    }).contents;
    return mod;
  });
};
