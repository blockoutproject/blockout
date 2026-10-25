import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { FollowButton, type FollowingTarget } from "../../following";

/** Current public target/season; other action owners retain their existing slots. */
export interface SportingActionsProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
}

/** Keeps the private follow read independent of public sporting consultation. */
export function SportingActions(props: SportingActionsProps) {
  return <FollowButton {...props} />;
}
