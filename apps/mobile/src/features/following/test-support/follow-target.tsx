import {
  FollowControl,
  type FollowControlProps,
} from "../components/follow-button";
import { useFollowStateQuery } from "../api/use-follow-state-query";

/** Exercises the real control and relationship reader within each scenario's actual session providers. */
export function FollowTarget(
  props: Readonly<Omit<FollowControlProps, "read">>,
) {
  const read = useFollowStateQuery(props.target);
  return <FollowControl {...props} read={read} />;
}
