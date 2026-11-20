import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useRef } from "react";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useAdvertising } from "@/features/advertising/advertising-provider";

export type SportingResourceKind = "club" | "team" | "pool" | "match";

/** Opens a sporting detail only while its original row and tab are current. */
export function useSportingNavigation(active = true) {
  const router = useRouter();
  const navigation = useNavigation();
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
    return () => {
      currentActive.current = false;
    };
  }, [active]);
  const { openSportingDestination } = useAdvertising();
  const feedback = useActionFeedback();

  function navigate(
    kind: SportingResourceKind,
    id: string,
    onFailure?: () => void,
  ) {
    feedback.clear();
    openSportingDestination(
      open,
      () => currentActive.current && navigation.isFocused(),
    );

    function open() {
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
    }
  }

  return { navigate };
}
