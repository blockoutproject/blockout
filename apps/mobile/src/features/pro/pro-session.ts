import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";
import type { SessionSnapshot } from "../accounts";
import { type ProOperation, type ProSessionState } from "./pro-state";
import {
  restoredProOperation,
  restoreErrorOutcome,
  verifiedProOperation,
} from "./pro-operations";

/** Current native evidence and verification lifecycle; rights remain SDK-owned. */
export interface ProSessionSnapshot {
  evidence: ProSessionState | null;
  /** The current attributed read owns both callback acceptance and the derived pending presentation. */
  read: symbol | null;
  verificationFailed: boolean;
}

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
  let identityInFlight = false;
  let snapshot: ProSessionSnapshot = {
    evidence: null,
    read: null,
    verificationFailed: false,
  };
  const listeners = new Set<() => void>();

  /** Notifies React without storing a derived entitlement or a second account lifetime. */
  function publish(next: ProSessionSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  /** Accepts only reads started after successful association for the still-current target. */
  function isAssociated(session: SessionSnapshot) {
    return (
      sameSession(target, session) &&
      snapshot.evidence?.association === "associated"
    );
  }

  /** Returns the accepted read outcome; obsolete or unstarted attempts return undefined. */
  async function refresh(
    session: SessionSnapshot,
  ): Promise<boolean | undefined> {
    if (!isAssociated(session)) {
      return;
    }
    const request = Symbol();
    publish({ ...snapshot, read: request });
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (
        isAssociated(session) &&
        snapshot.read === request &&
        snapshot.evidence
      ) {
        publish({
          evidence: {
            ...snapshot.evidence,
            customerInfo,
            operation: verifiedProOperation(
              snapshot.evidence.operation,
              customerInfo,
            ),
          },
          read: null,
          verificationFailed: false,
        });
        return true;
      }
    } catch {
      diagnose("read", "failed");
      if (isAssociated(session) && snapshot.read === request) {
        // A failed refresh never withdraws independently known current rights.
        publish({ ...snapshot, read: null, verificationFailed: true });
        return false;
      }
    }
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
        evidence: {
          session: desired,
          association: "associated",
          customerInfo,
          operation: "idle",
        },
        read: null,
        verificationFailed: false,
      });
      if (!customerInfo) {
        void refresh(desired);
      }
    }
  }

  /** Settles one mutation before applying the newest desired target, without retaining a queue. */
  async function associate() {
    if (identityInFlight) {
      return;
    }
    identityInFlight = true;
    const desired = target;
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
          evidence: {
            session: desired,
            association: "failed",
            customerInfo: null,
            operation: "idle",
          },
          read: null,
          verificationFailed: true,
        });
      }
    } finally {
      identityInFlight = false;
      if (!sameSession(target, desired)) {
        void associate();
      }
    }
  }

  /** Accepts current SDK evidence directly; a normal refresh without supplied information never delays command feedback. */
  async function completeOperation(
    session: SessionSnapshot,
    operation: ProOperation,
    customerInfo?: CustomerInfo,
  ) {
    if (!isAssociated(session) || !snapshot.evidence) {
      return;
    }
    publish({
      ...snapshot,
      ...(customerInfo ? { read: null, verificationFailed: false } : {}),
      evidence: {
        ...snapshot.evidence,
        operation: verifiedProOperation(
          operation,
          customerInfo ?? snapshot.evidence.customerInfo,
        ),
        customerInfo: customerInfo ?? snapshot.evidence.customerInfo,
      },
    });
    if (operation === "pending" || operation === "failed") {
      diagnose("operation", operation);
    }
    if (!customerInfo) {
      void refresh(session);
    }
  }

  return {
    getSnapshot: () => snapshot,

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
      publish({
        evidence: next?.accountId
          ? {
              session: next,
              association: "pending",
              customerInfo: null,
              operation: "idle",
            }
          : null,
        read: null,
        verificationFailed: false,
      });
      void associate();
    },

    refresh,

    /** Returns a verification outcome when associated; association retry remains owned by its lifecycle. */
    async retry(session: SessionSnapshot): Promise<boolean | undefined> {
      if (
        !sameSession(target, session) ||
        !session.accountId ||
        identityInFlight
      ) {
        return;
      }
      if (isAssociated(session)) {
        return refresh(session);
      }
      publish({
        ...snapshot,
        evidence: {
          session,
          association: "pending",
          customerInfo: null,
          operation: "idle",
        },
        verificationFailed: false,
      });
      void associate();
    },

    /** Explicit fallback independent of offers; SDK failures reject for ordinary feedback and never replay restoration. */
    async restore(session: SessionSnapshot) {
      if (!isAssociated(session) || !snapshot.evidence) {
        return;
      }
      const association = snapshot.evidence?.session;
      try {
        const customerInfo = await Purchases.restorePurchases();
        if (!snapshot.evidence || snapshot.evidence.session !== association) {
          return;
        }
        await completeOperation(
          session,
          restoredProOperation(snapshot.evidence.operation, "restored"),
          customerInfo,
        );
      } catch (error) {
        if (!snapshot.evidence || snapshot.evidence.session !== association) {
          return;
        }
        const outcome = restoreErrorOutcome(error);
        await completeOperation(
          session,
          restoredProOperation(snapshot.evidence.operation, outcome),
        );
        if (outcome === "failed") {
          throw error;
        }
      }
    },

    completeOperation,
  };
}

/** One owner for the process-wide native SDK, surviving React provider remounts. */
export const proSession = createProSession();
