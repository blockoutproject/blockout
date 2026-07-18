package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class MatchLiveModerationPolicy {

    public Optional<MatchLiveModerationLinkSnapshot> selectRepresentative(
            List<MatchLiveModerationLinkSnapshot> links,
            LiveLinkStatusEnum statusFilter) {
        if (links == null || links.isEmpty()) {
            return Optional.empty();
        }
        if (statusFilter != null && links.stream().noneMatch(link -> link.status() == statusFilter)) {
            return Optional.empty();
        }
        return links.stream()
                .max(Comparator.comparingInt((MatchLiveModerationLinkSnapshot link) -> statusPriority(link.status()))
                        .thenComparing(MatchLiveModerationLinkSnapshot::createdAt,
                                Comparator.nullsLast(Comparator.naturalOrder())));
    }

    public void validatePending(MatchLiveModerationLinkSnapshot link) {
        if (link.status() != LiveLinkStatusEnum.PENDING) {
            throw new IllegalStateException("Ce lien n'est pas en attente de validation.");
        }
    }

    public void validateReactivatable(MatchLiveModerationLinkSnapshot link) {
        LiveLinkStatusEnum status = link.status();
        if (status != LiveLinkStatusEnum.REJECTED && status != LiveLinkStatusEnum.EXPIRED
                && status != LiveLinkStatusEnum.DEACTIVATED && status != LiveLinkStatusEnum.BANNED) {
            throw new IllegalStateException("Ce lien ne peut pas être réactivé dans son état actuel.");
        }
    }

    private int statusPriority(LiveLinkStatusEnum status) {
        if (status == null) {
            return 0;
        }
        return switch (status) {
            case ACTIVE -> 6;
            case PENDING -> 5;
            case BANNED -> 4;
            case DEACTIVATED -> 3;
            case REJECTED -> 2;
            case EXPIRED -> 1;
        };
    }
}
