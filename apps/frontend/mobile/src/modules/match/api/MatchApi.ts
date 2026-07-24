import {
  getMatchById,
  getMatchList,
} from "@/src/shared/generated/endpoints/match-public";
import {
  approvePendingLink,
  deleteLiveLink,
  getLiveLinksHistory,
  listMatchesForLiveModeration,
  reactivateLiveLink,
  rejectPendingLink,
  reportLiveLink,
  upsertLiveLink,
} from "@/src/shared/generated/endpoints/match-secure";
import type {
  LiveLinkStatusEnum,
  MatchStatusEnum,
  ReportMatchLiveLinkRequest,
  UpsertMatchLiveLinkRequest,
} from "@/src/shared/generated/models";

/** Expose match operations through the feature API boundary. */
export class MatchApi {
  /** Load the requested page of public matches. */
  public getMatches(params: {
    page?: number;
    size?: number;
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatusEnum;
  }) {
    return getMatchList(params);
  }

  /** Load one public match projection. */
  public getMatchById(id: number) {
    return getMatchById(id);
  }

  /** Create or replace the current user's live link. */
  public upsertMatchLiveLink(
    matchId: number,
    data: UpsertMatchLiveLinkRequest,
  ) {
    return upsertLiveLink(matchId, data);
  }

  /** Delete the current user's live link. */
  public deleteMatchLiveLink(matchId: number) {
    return deleteLiveLink(matchId);
  }

  /** Report one live link. */
  public reportMatchLiveLink(
    matchId: number,
    data: ReportMatchLiveLinkRequest,
  ) {
    return reportLiveLink(matchId, data);
  }

  /** Load the live-link moderation history for one match. */
  public getMatchLiveLinksHistory(matchId: number) {
    return getLiveLinksHistory(matchId);
  }

  /** Load matches requiring live-link moderation. */
  public getMatchesForLiveModeration(status?: LiveLinkStatusEnum) {
    return listMatchesForLiveModeration(status ? { status } : undefined);
  }

  /** Approve a pending live link. */
  public approvePendingLiveLink(liveLinkId: number) {
    return approvePendingLink(liveLinkId);
  }

  /** Reject a pending live link. */
  public rejectPendingLiveLink(liveLinkId: number) {
    return rejectPendingLink(liveLinkId);
  }

  /** Reactivate a previously deactivated live link. */
  public reactivateLiveLink(liveLinkId: number) {
    return reactivateLiveLink(liveLinkId);
  }
}
