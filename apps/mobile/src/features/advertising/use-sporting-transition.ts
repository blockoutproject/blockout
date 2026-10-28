import { useLayoutEffect, useRef, useState } from "react";
import { useAccountSession } from "../accounts/current-account";
import { useAccessAdmission } from "../access/queries/use-access-admission";
import { useAgeDeclaration } from "./age-declaration-context";
import type { SportingAdTransitionResult } from "./sporting-ad-transition";

/** One voluntary resource or exact live-link opening; its caller retains destination failure feedback. */
export interface SportingOpening {
  kind: "club" | "team" | "pool" | "match" | "live";
  target: string;
  open(): void | Promise<void>;
  /** Additional current-resource/version check, evaluated again before destination release. */
  isCurrent?(): boolean;
  onFailure?(): void;
}

/** Retains one caller's identity only while F11 owns the accepted transition; no count or SDK state. */
interface PendingOpening {
  kind: SportingOpening["kind"];
  target: string;
  isCurrent(): boolean;
  result: Promise<SportingAdTransitionResult>;
}

/**
 * Connects a mounted sporting interaction to the installation's single F11 owner. Repeated taps
 * reuse its pending key; session changes, lost admission and unmount retire destination validity.
 * Destination failures remain separate from SDK failures and use the caller's safe feedback.
 */
export function useSportingTransition() {
  const { privacy } = useAgeDeclaration();
  const account = useAccountSession();
  const admission = useAccessAdmission();
  const currentAdmission = useRef(admission.ordinary);
  const mounted = useRef(false);
  const active = useRef<PendingOpening | undefined>(undefined);
  const [pending, setPending] = useState(false);
  useLayoutEffect(() => {
    currentAdmission.current = admission.ordinary;
  }, [admission.ordinary]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Captures original-session validity and deduplicates only the same still-pending destination. */
  function open(action: SportingOpening): Promise<SportingAdTransitionResult> {
    if (active.current && !active.current.isCurrent())
      active.current = undefined;
    if (active.current)
      return active.current.kind === action.kind &&
        active.current.target === action.target
        ? active.current.result
        : Promise.resolve({ status: "busy" });
    const original = account.getSnapshot();
    const isCurrent = () =>
      mounted.current &&
      currentAdmission.current &&
      account.isCurrent(original.generation) &&
      account.getSnapshot().accountId === original.accountId &&
      (action.isCurrent?.() ?? true);
    if (!isCurrent()) return Promise.resolve({ status: "abandoned" });
    setPending(true);
    const result = privacy
      .openSportingTransition({
        key: {},
        kind: action.kind,
        voluntary: true,
        isCurrent,
        open: action.open,
      })
      .then((outcome) => {
        if (outcome.status === "destination-failed" && isCurrent())
          action.onFailure?.();
        return outcome;
      })
      .finally(() => {
        if (active.current?.result !== result) return;
        active.current = undefined;
        if (mounted.current) setPending(false);
      });
    active.current = {
      kind: action.kind,
      target: action.target,
      isCurrent,
      result,
    };
    return result;
  }

  return { pending, open };
}
