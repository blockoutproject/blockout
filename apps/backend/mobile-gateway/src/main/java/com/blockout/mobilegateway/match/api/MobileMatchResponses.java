package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.generated.model.MobileMatchDayGroup;
import com.blockout.mobilegateway.generated.model.MobileMatchDayPageResponse;
import com.blockout.mobilegateway.generated.model.MobileMatchDetail;
import com.blockout.mobilegateway.generated.model.MobileMatchDetailDivision;
import com.blockout.mobilegateway.generated.model.MobileMatchDetailPool;
import com.blockout.mobilegateway.generated.model.MobileMatchDetailTeam;
import com.blockout.mobilegateway.generated.model.MobileMatchListDivision;
import com.blockout.mobilegateway.generated.model.MobileMatchListItem;
import com.blockout.mobilegateway.generated.model.MobileMatchListPool;
import com.blockout.mobilegateway.generated.model.MobileMatchListTeam;
import com.blockout.mobilegateway.generated.model.MobileMatchLiveLinkHistoryItem;
import com.blockout.mobilegateway.generated.model.MobileMatchLiveLinkHistoryPageResponse;
import com.blockout.mobilegateway.generated.model.MobileMatchLiveLinkResult;
import com.blockout.mobilegateway.generated.model.MobileMatchModerationDivision;
import com.blockout.mobilegateway.generated.model.MobileMatchModerationItem;
import com.blockout.mobilegateway.generated.model.MobileMatchModerationPageResponse;
import com.blockout.mobilegateway.generated.model.MobileMatchModerationPool;
import com.blockout.mobilegateway.generated.model.MobileMatchModerationTeam;
import com.blockout.mobilegateway.generated.model.MobileMatchPoolGroup;
import com.blockout.mobilegateway.generated.model.MobileMatchRankingTeam;
import com.blockout.mobilegateway.generated.model.MobileMatchSignedDocuments;
import com.blockout.mobilegateway.match.application.MobileMatchLiveWorkflow;
import com.blockout.mobilegateway.match.application.MobileMatchWorkflow;
import com.blockout.shared.model.PageInfo;
import java.net.URI;

/** Maps match application views to generated mobile-gateway response models. */
public final class MobileMatchResponses {

    private MobileMatchResponses() {
    }

    /** Maps one match-day page. */
    public static MobileMatchDayPageResponse days(MobileMatchWorkflow.DayPageView value) {
        return new MobileMatchDayPageResponse(
                value.dayMatches().stream().map(MobileMatchResponses::day).toList(),
                value.hasNext(),
                value.nextPage());
    }

    /** Maps one all-or-error match detail. */
    public static MobileMatchDetail detail(MobileMatchWorkflow.DetailView value) {
        return new MobileMatchDetail(
                value.id(), value.matchDate(), value.set(), value.score(), value.status(), value.venue(),
                value.firstReferee(), value.secondReferee(), value.liveUrl(), value.liveProvider(),
                value.liveOwnerAuth0Id(), detailTeam(value.teamA()), detailTeam(value.teamB()),
                detailPool(value.pool()),
                new MobileMatchSignedDocuments(
                        URI.create(value.signedDocuments().addressPdfUrl()),
                        URI.create(value.signedDocuments().sheetPdfUrl())));
    }

    /** Maps one live-link command result. */
    public static MobileMatchLiveLinkResult liveLink(MobileMatchLiveWorkflow.LiveLinkView value) {
        return new MobileMatchLiveLinkResult(value.matchId(), value.provider(), value.url(), value.status());
    }

    /** Maps one live-link history page. */
    public static MobileMatchLiveLinkHistoryPageResponse history(
            MobileMatchLiveWorkflow.PageView<MobileMatchLiveWorkflow.HistoryView> value) {
        return new MobileMatchLiveLinkHistoryPageResponse(
                value.items().stream().map(MobileMatchResponses::historyItem).toList(), pageInfo(value));
    }

    /** Maps one moderation page. */
    public static MobileMatchModerationPageResponse moderation(
            MobileMatchLiveWorkflow.PageView<MobileMatchLiveWorkflow.ModerationView> value) {
        return new MobileMatchModerationPageResponse(
                value.items().stream().map(MobileMatchResponses::moderationItem).toList(), pageInfo(value));
    }

    private static MobileMatchDayGroup day(MobileMatchWorkflow.DayView value) {
        return new MobileMatchDayGroup(
                value.date(), value.pools().stream().map(MobileMatchResponses::poolGroup).toList());
    }

    private static MobileMatchPoolGroup poolGroup(MobileMatchWorkflow.PoolGroupView value) {
        return new MobileMatchPoolGroup(
                listPool(value.pool()), value.matches().stream().map(MobileMatchResponses::listMatch).toList());
    }

    private static MobileMatchListPool listPool(MobileMatchWorkflow.ListPoolView value) {
        return new MobileMatchListPool(
                value.id(), value.leagueCode(), value.leagueName(), value.shortName(), value.gender(),
                new MobileMatchListDivision(
                        value.division().name(), value.division().firstGradientColor(),
                        value.division().secondGradientColor(), value.division().thirdGradientColor(),
                        value.division().logoUrl()));
    }

    private static MobileMatchListItem listMatch(MobileMatchWorkflow.MatchListView value) {
        return new MobileMatchListItem(
                value.id(), value.matchDate(), value.set(), value.status(), value.liveUrl(),
                listTeam(value.teamA()), listTeam(value.teamB()));
    }

    private static MobileMatchListTeam listTeam(MobileMatchWorkflow.ListTeamView value) {
        return value == null ? null : new MobileMatchListTeam(value.shortName(), value.logoUrl());
    }

    private static MobileMatchDetailTeam detailTeam(MobileMatchWorkflow.DetailTeamView value) {
        return new MobileMatchDetailTeam(value.id(), value.name(), value.shortName(), value.logoUrl());
    }

    private static MobileMatchDetailPool detailPool(MobileMatchWorkflow.DetailPoolView value) {
        return new MobileMatchDetailPool(
                value.id(), value.season(), value.poolCode(), value.leagueCode(), value.leagueName(), value.name(),
                value.shortName(), value.gender(),
                value.ranking().stream().map(MobileMatchResponses::ranking).toList(),
                new MobileMatchDetailDivision(
                        value.division().name(), value.division().mainColor(),
                        value.division().firstGradientColor(), value.division().secondGradientColor(),
                        value.division().thirdGradientColor(), value.division().logoUrl()));
    }

    private static MobileMatchRankingTeam ranking(MobileMatchWorkflow.RankingTeamView value) {
        return new MobileMatchRankingTeam(
                value.id(), value.shortName(), value.logoUrl(), value.points(), value.played(), value.wins(),
                value.losses());
    }

    private static MobileMatchLiveLinkHistoryItem historyItem(MobileMatchLiveWorkflow.HistoryView value) {
        return new MobileMatchLiveLinkHistoryItem(
                value.id(), value.provider(), value.url(), value.status(), value.reportCount(), value.ownerAuth0Id(),
                value.createdAt(), value.lastUpdate());
    }

    private static MobileMatchModerationItem moderationItem(MobileMatchLiveWorkflow.ModerationView value) {
        return new MobileMatchModerationItem(
                value.id(), value.matchDate(), value.season(), value.set(), value.lastLiveLinkStatus(),
                value.lastLiveLinkCreatedAt(), moderationTeam(value.teamA()), moderationTeam(value.teamB()),
                new MobileMatchModerationPool(
                        value.pool().shortName(), value.pool().leagueName(),
                        new MobileMatchModerationDivision(
                                value.pool().division().name(), value.pool().division().firstGradientColor(),
                                value.pool().division().secondGradientColor(),
                                value.pool().division().thirdGradientColor())));
    }

    private static MobileMatchModerationTeam moderationTeam(MobileMatchLiveWorkflow.ModerationTeamView value) {
        return new MobileMatchModerationTeam(value.name(), value.shortName(), value.logoUrl());
    }

    private static PageInfo pageInfo(MobileMatchLiveWorkflow.PageView<?> value) {
        return new PageInfo(value.page(), value.pageSize(), value.hasNext()).totalItems(value.totalItems());
    }
}
