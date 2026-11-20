import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useRef } from "react";
import { AppState } from "react-native";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { useAgeDeclaration } from "@/features/advertising/age-declaration-context";

export type SportingResourceKind = "club" | "team" | "pool" | "match";

/** Voluntary detail openings share one advertising opportunity while Router owns ordinary history. */
export function useSportingNavigation(active = true) {
  const router = useRouter();
  const navigation = useNavigation();
  const admission = useAccessAdmission();
  const { privacy } = useAgeDeclaration();
  const feedback = useActionFeedback();
  const current = useRef(false);
  useLayoutEffect(() => {
    current.current = active && admission.ordinary;
    return () => {
      current.current = false;
    };
  }, [active, admission.ordinary]);

  /** Opens an exact resource and leaves destination failure feedback with the initiating interaction. */
  function navigate(
    kind: SportingResourceKind,
    id: string,
    onFailure?: () => void,
  ) {
    const isCurrent = () => current.current && navigation.isFocused();
    if (!isCurrent()) {
      return;
    }
    feedback.clear();
    privacy.openSportingDetail(AppState.currentState === "active", () => {
      if (!isCurrent()) {
        return;
      }
      try {
        if (kind === "club") {
          router.push({ pathname: "/clubs/[clubId]", params: { clubId: id } });
        } else if (kind === "team") {
          router.push({ pathname: "/teams/[teamId]", params: { teamId: id } });
        } else if (kind === "pool") {
          router.push({ pathname: "/pools/[poolId]", params: { poolId: id } });
        } else {
          router.push({
            pathname: "/matches/[matchId]",
            params: { matchId: id },
          });
        }
      } catch {
        if (onFailure) {
          onFailure();
        } else {
          feedback.error();
        }
      }
    });
  }

  return { navigate };
}
