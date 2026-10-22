import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";
import type { SessionSnapshot } from "../accounts";
import type { ProOperation, ProSessionState } from "./pro-state";

/** Current native evidence and verification lifecycle; rights remain SDK-owned. */
export interface ProSessionSnapshot {
  evidence: ProSessionState | null;
  refreshing: boolean;
  verificationFailed: boolean;
}

/** Records bounded context only; raw SDK errors never enter the diagnostic pipeline. */
function diagnose(
  operation: "association" | "read" | "operation",
  outcome: "failed" | "pending" | "uncertain",
) {
  Sentry.captureException(new Error("Pro verification"), {
    tags: { feature: "pro", operation, outcome },
  });
}

/** Compares F05 attribution, including re-entry into the same business UUID. */
function sameSession(
  left: SessionSnapshot | null,
  right: SessionSnapshot | null,
) {
  return (
    left?.generation === right?.generation &&
    left?.accountId === right?.accountId
  );
}

/**
 * Owns sequential native identity mutations and generation-scoped reads in memory.
 * Target changes clear presentation synchronously. Failed current associations require retry;
 * obsolete mutations settle before the latest target runs. This never awaits F05 logout.
 */
export function createProSession() {
  let target: SessionSnapshot | null = null;
  let configured = false;
  let identityInFlight = false;
  let snapshot: ProSessionSnapshot = {
    evidence: null,
    refreshing: false,
    verificationFailed: false,
  };
  let currentRead: symbol | null = null;
  const listeners = new Set<() => void>();

  /** Notifies React without storing a derived entitlement or a second session generation. */
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

  /** Starts an SDK read per trigger; only its latest current-session result updates presentation. */
  async function refresh(session: SessionSnapshot): Promise<void> {
    if (!isAssociated(session)) return;
    const request = Symbol();
    currentRead = request;
    publish({ ...snapshot, refreshing: true });
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (
        isAssociated(session) &&
        currentRead === request &&
        snapshot.evidence
      ) {
        publish({
          evidence: { ...snapshot.evidence, customerInfo },
          refreshing: false,
          verificationFailed: false,
        });
      }
    } catch {
      diagnose("read", "failed");
      if (isAssociated(session) && currentRead === request) {
        // A failed refresh never withdraws independently known current rights.
        publish({ ...snapshot, refreshing: false, verificationFailed: true });
      }
    } finally {
      if (currentRead === request) currentRead = null;
    }
  }

  /** Settles one mutation before applying the newest desired target, without retaining a queue. */
  async function associate() {
    if (identityInFlight) return;
    identityInFlight = true;
    const desired = target;
    try {
      if (desired?.accountId) {
        let customerInfo: CustomerInfo | null = null;
        if (!configured) {
          const config = Constants.expoConfig?.extra?.revenueCat;
          const apiKey: unknown =
            Platform.OS === "ios" ? config?.iosApiKey : config?.androidApiKey;
          if (typeof apiKey !== "string" || !apiKey)
            throw new Error("Pro is not configured");
          // The SDK's default handler forwards raw provider strings to the console.
          Purchases.setLogHandler(() => {});
          Purchases.configure({ apiKey, appUserID: desired.accountId });
          configured = true;
          if (!(await Purchases.isConfigured()))
            throw new Error("Pro setup unavailable");
        } else {
          customerInfo = (await Purchases.logIn(desired.accountId))
            .customerInfo;
        }
        if (sameSession(target, desired)) {
          publish({
            evidence: {
              session: desired,
              association: "associated",
              customerInfo,
              operation: "idle",
            },
            refreshing: false,
            verificationFailed: false,
          });
          void refresh(desired);
        }
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
          refreshing: false,
          verificationFailed: true,
        });
      }
    } finally {
      identityInFlight = false;
      if (!sameSession(target, desired)) void associate();
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
      if (sameSession(target, next)) return;
      target = next;
      currentRead = null;
      publish({
        evidence: next?.accountId
          ? {
              session: next,
              association: "pending",
              customerInfo: null,
              operation: "idle",
            }
          : null,
        refreshing: false,
        verificationFailed: false,
      });
      void associate();
    },

    refresh,

    /** Retries only an explicit, still-current request; ordinary refresh never retries identity. */
    retry(session: SessionSnapshot) {
      if (
        !sameSession(target, session) ||
        !session.accountId ||
        identityInFlight
      )
        return;
      if (isAssociated(session)) {
        void refresh(session);
        return;
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

    /** Records an attributed outcome and reads native state directly, without replaying a transaction. */
    async completeOperation(session: SessionSnapshot, operation: ProOperation) {
      if (!isAssociated(session) || !snapshot.evidence) return;
      publish({ ...snapshot, evidence: { ...snapshot.evidence, operation } });
      if (
        operation === "pending" ||
        operation === "uncertain" ||
        operation === "failed"
      )
        diagnose("operation", operation);
      await refresh(session);
    },
  };
}

/** One owner for the process-wide native SDK, surviving React provider remounts. */
export const proSession = createProSession();
