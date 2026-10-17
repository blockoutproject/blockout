import * as Sentry from "@sentry/react-native";

/** Keeps only canonical packaged bundle names; arbitrary URL paths and query values are omitted. */
function bundleFilename(filename: string | undefined) {
  const match = filename?.match(
    /(?:^|\/)(index(?:\.android|\.ios)?\.bundle|main\.jsbundle)(?:[?#].*)?$/,
  );
  return match ? `app:///${match[1]}` : undefined;
}

/** Preserves packaged source coordinates without source excerpts, local variables or raw URLs. */
function safeFrames(frames: Sentry.StackFrame[] | undefined) {
  return frames?.flatMap((frame) => {
    const filename = bundleFilename(frame.filename);
    return filename
      ? [
          {
            filename,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          },
        ]
      : [];
  });
}

/** Builds an error-only projection after scope enrichment; native crashes use the native callbacks. */
function safeError(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (!event.exception?.values?.length) return null;

  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    level: event.level,
    platform: event.platform,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    sdk: event.sdk,
    exception: {
      values: event.exception.values.map((exception) => ({
        type: exception.type,
        mechanism: exception.mechanism
          ? {
              type: exception.mechanism.type,
              handled: exception.mechanism.handled,
            }
          : undefined,
        stacktrace: { frames: safeFrames(exception.stacktrace?.frames) },
      })),
    },
    debug_meta: {
      images: event.debug_meta?.images?.flatMap((image) => {
        if (image.type !== "sourcemap") return [];
        const codeFile = bundleFilename(image.code_file);
        return codeFile
          ? [
              {
                type: image.type,
                debug_id: image.debug_id,
                code_file: codeFile,
              },
            ]
          : [];
      }),
    },
  };
}

/** Configures the SDK once at the native route entry; local builds send no reports. */
export function initializeSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    enabled: !__DEV__ && Boolean(dsn),
    autoInitializeNativeSdk: false,
    sendDefaultPii: false,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    // Sampling options stay absent so the SDK does not install replay/tracing/profiling integrations.
    beforeSend: safeError,
  });
}
