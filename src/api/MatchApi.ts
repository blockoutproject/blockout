import { CONFIG } from "@/src/config/config";
import {
    EnrichedDayPageDTO,
    EnrichedMatchDTO,
    EnrichedMatchLiveSummaryDTO,
    LiveLinkStatus,
    MatchLiveLinkDTO,
    MatchLiveLinkReportRequestDTO,
    MatchLiveLinkRequestDTO,
    MatchLiveLinkResponseDTO,
    MatchStatus,
} from "@/src/types/Match";
import { BaseApi } from "./core/BaseApi";

export class MatchApi extends BaseApi {
    constructor() {
        super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
    }

    public getEnrichedMatches(params: {
        page?: number;
        size?: number;
        poolIds?: number[];
        teamIds?: number[];
        status: MatchStatus;
    }) {
        return this.httpPublic.get<EnrichedDayPageDTO>("/matches", { params });
    }

    public getEnrichedMatchById(id: number) {
        return this.httpPublic.get<EnrichedMatchDTO>(`/matches/${id}`);
    }

    public upsertMatchLiveLink(matchId: number, data: MatchLiveLinkRequestDTO) {
        return this.httpAuth.post<MatchLiveLinkResponseDTO>(
            `/matches/${matchId}/live-link`,
            data
        );
    }

    public deleteMatchLiveLink(matchId: number) {
        return this.httpAuth.delete<void>(`/matches/${matchId}/live-link`);
    }

    public reportMatchLiveLink(matchId: number, data: MatchLiveLinkReportRequestDTO) {
        return this.httpAuth.post<void>(
            `/matches/${matchId}/live-link/report`,
            data
        );
    }

    public getMatchLiveLinksHistory(matchId: number) {
        return this.httpAuth.get<MatchLiveLinkDTO[]>(
            `/matches/${matchId}/live-links`
        );
    }

    public getMatchesForLiveModeration(status?: LiveLinkStatus) {
        const params = status ? { status } : undefined;
        return this.httpAuth.get<EnrichedMatchLiveSummaryDTO[]>(
            "/matches/live-moderation",
            { params },
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