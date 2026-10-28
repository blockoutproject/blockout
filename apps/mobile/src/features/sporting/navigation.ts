import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useRef } from "react";
import { useActionFeedback } from "../../shared/components/action-feedback";
import { useSportingTransition } from "../advertising/use-sporting-transition";

/** Exact UUID routes share F11's accepted-opening boundary; inactive native tabs cannot release a former row's intent. */
export function useSportingNavigation(active = true) {
  const router = useRouter();
  const navigation = useNavigation();
  const currentActive = useRef(active);
  useLayoutEffect(() => {
    currentActive.current = active;
  }, [active]);
  const transition = useSportingTransition();
  const feedback = useActionFeedback();

  /** Keeps destination errors with the sporting interaction and never reports raw router failures. */
  function navigate(kind: "club" | "team" | "pool" | "match", id: string) {
    feedback.clear();
    return transition.open({
      kind,
      target: id,
      isCurrent: () => currentActive.current && navigation.isFocused(),
      open() {
        if (kind === "club")
          router.push({ pathname: "/clubs/[clubId]", params: { clubId: id } });
        else if (kind === "team")
          router.push({ pathname: "/teams/[teamId]", params: { teamId: id } });
        else if (kind === "pool")
          router.push({ pathname: "/pools/[poolId]", params: { poolId: id } });
        else
          router.push({
            pathname: "/matches/[matchId]",
            params: { matchId: id },
          });
      },
      onFailure: () => feedback.error(),
    });
  }

  return { pending: transition.pending, navigate };
}
