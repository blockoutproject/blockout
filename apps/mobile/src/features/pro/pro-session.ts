import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";
import type { SessionSnapshot } from "@/features/accounts";
import { type ProOperation, type ProSessionState } from "./pro-state";
import { verifiedProOperation } from "./pro-operations";

/** Records bounded context only; raw SDK errors never enter the diagnostic pipeline. */
function diagnose(
  operation: "association" | "read" | "operation",
  outcome: "failed" | "pending",
) {
  Sentry.captureException(new Error("Pro verification"), {
    tags: { feature: "pro", operation, outcome },
  });
}

/** Compares F05 attribution, using the native principal and established business UUID. */
function sameSession(
  left: SessionSnapshot | null,
  right: SessionSnapshot | null,
) {
  return (
    left?.subject === right?.subject && left?.accountId === right?.accountId
  );
}

/**
 * Owns sequential native identity mutations and principal-attributed reads in memory.
 * Target changes clear presentation synchronously. Failed current associations require retry;
 * obsolete mutations settle before the latest target runs. This never awaits F05 logout.
 */
export function createProSession() {
  let target: SessionSnapshot | null = null;
  let identityInFlight: Promise<void> | null = null;
  // A new target or supplied CustomerInfo retires the previous read.
  let latestRead: symbol | null = null;
  let evidence: ProSessionState | null = null;
  const listeners = new Set<() => void>();

  /** Keeps the snapshot stable until its attributed evidence changes. */
  function publish(next: ProSessionState | null) {
    if (
      evidence?.session === next?.session &&
      evidence?.association === next?.association &&
      evidence?.customerInfo === next?.customerInfo &&
      evidence?.operation === next?.operation
    ) {
      return;
    }
    evidence = next;
    listeners.forEach((listener) => listener());
  }

  function associatedEvidence(session: SessionSnapshot) {
    if (
      sameSession(target, session) &&
      evidence?.association === "associated"
    ) {
      return evidence;
    }
    return null;
  }

  /** Publishes current rights after an attributed read and retains them on SDK failure. */
  async function refresh(session: SessionSnapshot) {
    if (!associatedEvidence(session)) {
      return;
    }
    const request = Symbol();
    latestRead = request;
    let customerInfo: CustomerInfo;
    try {
      customerInfo = await Purchases.getCustomerInfo();
    } catch {
      diagnose("read", "failed");
      return;
    }
    const current = associatedEvidence(session);
    if (latestRead !== request || !current) {
      return;
    }
    publish({
      ...current,
      customerInfo,
      operation: verifiedProOperation(current.operation, customerInfo),
    });
  }

  /** Configures or logs in exactly one captured account, publishing rights only while that target remains current. */
  async function associateAccount(
    desired: SessionSnapshot,
    configured: boolean,
    accountId: string,
  ) {
    let customerInfo: CustomerInfo | null = null;
    if (!configured) {
      const config = Constants.expoConfig?.extra?.revenueCat;
      const apiKey: unknown =
        Platform.OS === "ios" ? config?.iosApiKey : config?.androidApiKey;
      if (typeof apiKey !== "string" || !apiKey) {
        throw new Error("Pro is not configured");
      }
      // The SDK's default handler forwards raw provider strings to the console.
      Purchases.setLogHandler(() => {});
      Purchases.configure({ apiKey, appUserID: accountId });
      if (!(await Purchases.isConfigured())) {
        throw new Error("Pro setup unavailable");
      }
    } else {
      customerInfo = (await Purchases.logIn(accountId)).customerInfo;
    }
    if (sameSession(target, desired)) {
      publish({
        session: desired,
        association: "associated",
        customerInfo,
        operation: "idle",
      });
      if (!customerInfo) {
        void refresh(desired);
      }
    }
  }

  /** Settles one mutation before applying the newest desired target, without retaining a queue. */
  function associate(): Promise<void> {
    if (identityInFlight) {
      return identityInFlight;
    }
    const desired = target;
    identityInFlight = (async () => {
      try {
        const configured = await Purchases.isConfigured();
        if (!sameSession(target, desired)) {
          return;
        }
        if (desired?.accountId) {
          await associateAccount(desired, configured, desired.accountId);
        } else if (configured && !(await Purchases.isAnonymous())) {
          await Purchases.logOut();
        }
      } catch {
        diagnose("association", "failed");
        if (sameSession(target, desired) && desired?.accountId) {
          publish({
            session: desired,
            association: "failed",
            customerInfo: null,
            operation: "idle",
          });
        }
      }
    })().finally(() => {
      identityInFlight = null;
      if (!sameSession(target, desired)) {
        return associate();
      }
    });
    return identityInFlight;
  }

  /** Accepts current SDK evidence directly; a normal refresh without supplied information never delays command feedback. */
  async function completeOperation(
    session: SessionSnapshot,
    operation: ProOperation,
    customerInfo?: CustomerInfo,
  ) {
    const current = associatedEvidence(session);
    if (!current) {
      return;
    }
    if (customerInfo) {
      latestRead = null;
    }
    const nextInfo = customerInfo ?? current.customerInfo;
    publish({
      ...current,
      operation: verifiedProOperation(operation, nextInfo),
      customerInfo: nextInfo,
    });
    if (operation === "pending" || operation === "failed") {
      diagnose("operation", operation);
    }
    if (!customerInfo) {
      void refresh(session);
    }
  }

  return {
    getSnapshot: () => evidence,

    /** Subscribes to transient evidence; disposing removes only this observer. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Consumes F05 publication immediately; null detaches presentation and requests native logout. */
    setTarget(next: SessionSnapshot | null) {
      if (sameSession(target, next)) {
        return;
      }
      target = next;
      latestRead = null;
      publish(
        next?.accountId
          ? {
              session: next,
              association: "pending",
              customerInfo: null,
              operation: "idle",
            }
          : null,
      );
      void associate();
    },

    refresh,

    /** Waits only for current native identity association, never for an entitlement read or disposed view. */
    async prepare(session: SessionSnapshot): Promise<boolean> {
      if (!sameSession(target, session) || !session.accountId) {
        return false;
      }
      if (!associatedEvidence(session)) {
        await associate();
      }
      return associatedEvidence(session) !== null;
    },

    completeOperation,
  };
}

/** One owner for the process-wide native SDK, surviving React provider remounts. */
export const proSession = createProSession();
