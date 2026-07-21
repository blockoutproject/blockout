import {CONFIG} from "@/src/shared/config/config";
import {
  DayPageResponse,
  MatchResponse,
  MatchLiveSummaryResponse,
  LiveLinkStatus,
  MatchLiveLinkInternalResponse,
  ReportMatchLiveLinkRequest,
  UpsertMatchLiveLinkRequest,
  UpsertMatchLiveLinkResponse,
  MatchStatus,
} from "@/src/modules/match/model/Match";
import {BaseApi} from "@/src/shared/api/BaseApi";

export class MatchApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public getMatches(params: {
    page?: number;
    size?: number;
    poolIds?: number[];
    teamIds?: number[];
    status: MatchStatus;
  }) {
    return this.httpPublic.get<DayPageResponse>("/matches", {params});
  }

  public getMatchById(id: number) {
    return this.httpPublic.get<MatchResponse>(`/matches/${id}`);
  }

  public upsertMatchLiveLink(matchId: number, data: UpsertMatchLiveLinkRequest) {
    return this.httpAuth.post<UpsertMatchLiveLinkResponse>(
      `/matches/${matchId}/live-link`,
      data
    );
  }

  public deleteMatchLiveLink(matchId: number) {
    return this.httpAuth.delete<void>(`/matches/${matchId}/live-link`);
  }

  public reportMatchLiveLink(matchId: number, data: ReportMatchLiveLinkRequest) {
    return this.httpAuth.post<void>(
      `/matches/${matchId}/live-link/report`,
      data
    );
  }

  public getMatchLiveLinksHistory(matchId: number) {
    return this.httpAuth.get<MatchLiveLinkInternalResponse[]>(
      `/matches/${matchId}/live-links`
    );
  }

  public getMatchesForLiveModeration(status?: LiveLinkStatus) {
    const params = status ? {status} : undefined;
    return this.httpAuth.get<MatchLiveSummaryResponse[]>(
      "/matches/live-moderation",
      {params},
    );
  }

  public approvePendingLiveLink(liveLinkId: number) {
    return this.httpAuth.post<void>(
      `/matches/live-links/${liveLinkId}/approve`
    );
  }

  public rejectPendingLiveLink(liveLinkId: number) {
    return this.httpAuth.post<void>(
      `/matches/live-links/${liveLinkId}/reject`
    );
  }

  public reactivateLiveLink(liveLinkId: number) {
    return this.httpAuth.post<void>(
      `/matches/live-links/${liveLinkId}/reactivate`
    );
  }
}
