import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import type { CustomerInfo } from "react-native-purchases";
import type { SessionSnapshot } from "../accounts";
import {
  getProState,
  type ProOperation,
  type ProSessionState,
} from "./pro-state";
import { canPurchasePro } from "./pro-offering";
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
  outcome: "failed" | "pending" | "uncertain",
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
    if (!isAssociated(session)) return;
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

  /** Settles one mutation before applying the newest desired target, without retaining a queue. */
  async function associate() {
    if (identityInFlight) return;
    identityInFlight = true;
    const desired = target;
    try {
      const configured = await Purchases.isConfigured();
      if (!sameSession(target, desired)) return;
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
            read: null,
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
          read: null,
          verificationFailed: true,
        });
      }
    } finally {
      identityInFlight = false;
      if (!sameSession(target, desired)) void associate();
    }
  }

  /** Applies attributed callback evidence before the ordinary read, preserving confirmed payment on read failure. */
  async function completeOperation(
    session: SessionSnapshot,
    operation: ProOperation,
    customerInfo?: CustomerInfo,
  ) {
    if (!isAssociated(session) || !snapshot.evidence) return;
    publish({
      ...snapshot,
      evidence: {
        ...snapshot.evidence,
        operation: verifiedProOperation(
          operation,
          customerInfo ?? snapshot.evidence.customerInfo,
        ),
        customerInfo: customerInfo ?? snapshot.evidence.customerInfo,
      },
    });
    if (
      operation === "pending" ||
      operation === "uncertain" ||
      operation === "restore-uncertain" ||
      operation === "failed"
    )
      diagnose(
        "operation",
        operation === "restore-uncertain" ? "uncertain" : operation,
      );
    await refresh(session);
  }

  /** Records native restoration and captures its preceding outcome without starting a second store call. */
  function beginRestore(session: SessionSnapshot): ProOperation | false {
    if (
      !isAssociated(session) ||
      !snapshot.evidence ||
      ["purchasing", "restoring"].includes(snapshot.evidence.operation)
    )
      return false;
    const previous = snapshot.evidence.operation;
    // Keep unresolved payment visible even if restoration is interrupted or its callback never arrives.
    if (restoredProOperation(previous, "restoring") === "restoring")
      publish({
        ...snapshot,
        evidence: { ...snapshot.evidence, operation: "restoring" },
      });
    return previous;
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
      )
        return;
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

    /** Atomically reserves one native explicit purchase; this does not execute or replay store payment. */
    beginPurchase(session: SessionSnapshot): boolean {
      if (
        !isAssociated(session) ||
        !snapshot.evidence ||
        !canPurchasePro(
          getProState(
            { status: "authenticated", ...session },
            snapshot.evidence,
          ),
        )
      )
        return false;
      publish({
        ...snapshot,
        evidence: { ...snapshot.evidence, operation: "purchasing" },
      });
      return true;
    },

    beginRestore,

    /** Explicit fallback for a missing offer/unknown rights; no retry or restoration on account entry. */
    async restore(session: SessionSnapshot) {
      const previous = beginRestore(session);
      if (previous === false) return;
      const association = snapshot.evidence?.session;
      try {
        const customerInfo = await Purchases.restorePurchases();
        if (snapshot.evidence?.session !== association) return;
        await completeOperation(
          session,
          restoredProOperation(previous, "restored"),
          customerInfo,
        );
      } catch (error) {
        if (snapshot.evidence?.session !== association) return;
        await completeOperation(
          session,
          restoredProOperation(previous, restoreErrorOutcome(error)),
        );
      }
    },

    /** Closing an in-flight presentation proves no cancellation; verification is the only follow-up. */
    async dismissPresentation(session: SessionSnapshot) {
      if (!isAssociated(session)) return;
      if (snapshot.evidence?.operation === "purchasing")
        await completeOperation(session, "uncertain");
      else if (snapshot.evidence?.operation === "restoring")
        await completeOperation(session, "restore-uncertain");
    },

    completeOperation,
  };
}

/** One owner for the process-wide native SDK, surviving React provider remounts. */
export const proSession = createProSession();
