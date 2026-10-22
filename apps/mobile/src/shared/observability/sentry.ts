import * as Sentry from "@sentry/react-native";

/** Accepts only Expo bundle names already normalized by Sentry's default integration. */
function bundleFilename(filename: string | undefined) {
  return filename === "app:///index.android.bundle" ||
    filename === "app:///main.jsbundle"
    ? filename
    : undefined;
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

/** Keeps standard JS error categories; custom Error.name values can contain user/provider content. */
function safeErrorType(type: string | undefined) {
  return type &&
    [
      "Error",
      "TypeError",
      "RangeError",
      "ReferenceError",
      "SyntaxError",
      "URIError",
      "EvalError",
      "AggregateError",
    ].includes(type)
    ? type
    : "Error";
}

/** Allows only the bounded Pro failure vocabulary; customer/provider fields remain excluded. */
function safeProTags(tags: Sentry.ErrorEvent["tags"]) {
  return tags?.feature === "pro" &&
    ["association", "read", "operation"].includes(String(tags.operation)) &&
    ["failed", "pending", "uncertain"].includes(String(tags.outcome))
    ? { feature: "pro", operation: tags.operation, outcome: tags.outcome }
    : undefined;
}

/** Filters enriched JS errors and their attachment hint; native crash reports bypass this hook. */
const safeError: NonNullable<Sentry.ReactNativeOptions["beforeSend"]> = (
  event,
  hint,
) => {
  hint.attachments = [];
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
    tags: safeProTags(event.tags),
    sdk: event.sdk
      ? {
          name: event.sdk.name,
          version: event.sdk.version,
          settings: { infer_ip: "never" },
        }
      : undefined,
    exception: {
      values: event.exception.values.map((exception) => ({
        type: safeErrorType(exception.type),
        mechanism: exception.mechanism
          ? {
              type: ["generic", "onerror", "onunhandledrejection"].includes(
                exception.mechanism.type,
              )
                ? exception.mechanism.type
                : "generic",
              handled: exception.mechanism.handled,
            }
          : undefined,
        stacktrace: { frames: safeFrames(exception.stacktrace?.frames) },
      })),
    },
    debug_meta: {
      images: event.debug_meta?.images?.flatMap((image) => {
        if (
          image.type !== "sourcemap" ||
          !image.debug_id ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            image.debug_id,
          )
        )
          return [];
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
};

/** Prepares bounded capture at the route entry; T033 qualification must precede any sending. */
export function initializeSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    // A DSN or release build cannot bypass the pending native privacy/symbolication gate.
    enabled: false,
    sendDefaultPii: false,
    sendClientReports: false,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableAppHangTracking: false,
    enableWatchdogTerminationTracking: false,
    enableCaptureFailedRequests: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableLogs: false,
    maxBreadcrumbs: 0,
    // Sampling options stay absent so the SDK does not install replay/tracing/profiling integrations.
    beforeSend: safeError,
  });
}
