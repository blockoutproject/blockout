/** Narrow sporting-page composition; private state and actions remain feature-owned. */
export { FollowButton, FollowControl } from "./components/follow-button";

export type {
  FollowButtonProps,
  FollowControlProps,
} from "./components/follow-button";

export { useFollowStateQuery } from "./api/use-follow-state-query";

export type { FollowStateRead } from "./api/use-follow-state-query";

export { FollowerCount } from "./components/follower-count";

export type { FollowingTarget } from "./api/following-keys";
