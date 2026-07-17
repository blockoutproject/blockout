package com.blockout.mobilegateway.match.outbound;

import com.blockout.mobilegateway.match.application.MobileMatchLiveGateway;
import com.blockout.mobilegateway.matchesclient.api.MatchLiveLinkHistoryClient;
import com.blockout.mobilegateway.matchesclient.api.MatchLiveLinkReportsClient;
import com.blockout.mobilegateway.matchesclient.api.MatchLiveLinksClient;
import com.blockout.mobilegateway.matchesclient.api.MatchModerationClient;
import com.blockout.mobilegateway.matchesclient.model.MatchLiveLinkHistoryItem;
import com.blockout.mobilegateway.matchesclient.model.MatchLiveLinkHistoryPageResponse;
import com.blockout.mobilegateway.matchesclient.model.MatchLiveLinkResult;
import com.blockout.mobilegateway.matchesclient.model.MatchLiveModerationPageResponse;
import com.blockout.mobilegateway.matchesclient.model.MatchLiveModerationSummary;
import com.blockout.mobilegateway.matchesclient.model.ReportMatchLiveLinkInternalRequest;
import com.blockout.mobilegateway.matchesclient.model.UpsertMatchLiveLinkInternalRequest;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.PageInfo;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Adapts generated secure matches-service clients to the live-link application port. */
@Component
@RequiredArgsConstructor
public class GeneratedMobileMatchLiveGateway implements MobileMatchLiveGateway {

    private final MatchLiveLinksClient linksClient;
    private final MatchLiveLinkReportsClient reportsClient;
    private final MatchLiveLinkHistoryClient historyClient;
    private final MatchModerationClient moderationClient;

    /** Relays an upsert and maps its canonical result. */
    @Override
    public LiveLinkView upsert(Long matchId, String url) {
        MatchLiveLinkResult result = linksClient.upsertMatchLiveLink(
                matchId, new UpsertMatchLiveLinkInternalRequest().url(URI.create(url)));
        return new LiveLinkView(result.getMatchId(), result.getProvider(), result.getUrl(), result.getStatus());
    }

    /** Relays an idempotent delete. */
    @Override
    public void delete(Long matchId) {
        linksClient.deleteMatchLiveLink(matchId);
    }

    /** Relays a report. */
    @Override
    public void report(Long matchId, String reason) {
        reportsClient.reportMatchLiveLink(matchId, new ReportMatchLiveLinkInternalRequest().reason(reason));
    }

    /** Loads and maps one canonical live-link history page. */
    @Override
    public PageView<HistoryView> history(Long matchId, int page, int pageSize) {
        MatchLiveLinkHistoryPageResponse response = historyClient.listMatchLiveLinkHistory(matchId, page, pageSize);
        return new PageView<>(
                response.getItems().stream().map(GeneratedMobileMatchLiveGateway::history).toList(),
                response.getPageInfo().getPage(),
                response.getPageInfo().getPageSize(),
                Boolean.TRUE.equals(response.getPageInfo().getHasNext()),
                response.getPageInfo().getTotalItems());
    }

    /** Loads and maps one canonical moderation page. */
    @Override
    public PageView<ModerationSnapshot> moderation(LiveLinkStatusEnum status, int page, int pageSize) {
        MatchLiveModerationPageResponse response = moderationClient.listMatchesForLiveModeration(status, page, pageSize);
        PageInfo info = response.getPageInfo();
        return new PageView<>(
                response.getItems().stream().map(GeneratedMobileMatchLiveGateway::moderation).toList(),
                info.getPage(),
                info.getPageSize(),
                Boolean.TRUE.equals(info.getHasNext()),
                info.getTotalItems());
    }

    /** Relays approval to matches-service. */
    @Override
    public void approve(Long liveLinkId) {
        moderationClient.approveMatchLiveLink(liveLinkId);
    }

    /** Relays rejection to matches-service. */
    @Override
    public void reject(Long liveLinkId) {
        moderationClient.rejectMatchLiveLink(liveLinkId);
    }

    /** Relays reactivation to matches-service. */
    @Override
    public void reactivate(Long liveLinkId) {
        moderationClient.reactivateMatchLiveLink(liveLinkId);
    }

    private static HistoryView history(MatchLiveLinkHistoryItem value) {
        return new HistoryView(
                value.getId(), value.getProvider(), value.getUrl(), value.getStatus(), value.getReportCount(),
                value.getOwnerAuth0Id(), value.getCreatedAt(), value.getLastUpdate());
    }

    private static ModerationSnapshot moderation(MatchLiveModerationSummary value) {
        return new ModerationSnapshot(
                value.getId(), value.getPoolId(), value.getTeamIdA(), value.getTeamIdB(), value.getMatchDate(),
                value.getSeason(), value.getSet(), value.getScore(), value.getStatus(), value.getLiveCode(),
                value.getLastLiveLinkId(), value.getLastLiveLinkStatus(), value.getLastLiveLinkProvider(),
                value.getLastLiveLinkUrl(), value.getLastLiveLinkOwnerAuth0Id(), value.getLastLiveLinkCreatedAt());
    }
}
