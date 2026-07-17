package com.blockout.mobilegateway.match.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.util.List;

/** Relays mobile live-link commands and read pages to matches-service. */
public interface MobileMatchLiveGateway {

    /** Creates or replaces the active link for a match. */
    LiveLinkView upsert(Long matchId, String url);

    /** Deactivates the active link when one exists. */
    void delete(Long matchId);

    /** Reports an active link. */
    void report(Long matchId, String reason);

    /** Loads one canonical history page. */
    PageView<HistoryView> history(Long matchId, int page, int pageSize);

    /** Loads one canonical moderation page. */
    PageView<ModerationSnapshot> moderation(LiveLinkStatusEnum status, int page, int pageSize);

    /** Approves one pending link. */
    void approve(Long liveLinkId);

    /** Rejects one pending link. */
    void reject(Long liveLinkId);

    /** Reactivates one eligible link. */
    void reactivate(Long liveLinkId);

    /** Canonical live-link command result. */
    record LiveLinkView(Long matchId, LiveProviderEnum provider, String url, LiveLinkStatusEnum status) {
    }

    /** Canonical live-link history item. */
    record HistoryView(
            Long id,
            LiveProviderEnum provider,
            String url,
            LiveLinkStatusEnum status,
            Integer reportCount,
            String ownerAuth0Id,
            Instant createdAt,
            Instant lastUpdate) {
    }

    /** Match fields needed to build one moderation card. */
    record ModerationSnapshot(
            Long id,
            Long poolId,
            Long teamIdA,
            Long teamIdB,
            Instant matchDate,
            String season,
            String set,
            String score,
            MatchStatusEnum status,
            Long liveCode,
            Long lastLiveLinkId,
            LiveLinkStatusEnum lastLiveLinkStatus,
            LiveProviderEnum lastLiveLinkProvider,
            String lastLiveLinkUrl,
            String lastLiveLinkOwnerAuth0Id,
            Instant lastLiveLinkCreatedAt) {
    }

    /** Transport-neutral page metadata and items. */
    record PageView<T>(List<T> items, int page, int pageSize, boolean hasNext, Long totalItems) {

        /** Defensively copies page items. */
        public PageView {
            items = items == null ? List.of() : List.copyOf(items);
        }
    }
}
