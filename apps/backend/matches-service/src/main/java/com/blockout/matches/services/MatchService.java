package com.blockout.matches.services;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.models.dto.match.MatchLiveSummaryDTO;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Transitional owner for live-moderation behavior that moves in MRG-361 and MRG-362.
 * Match core and day-page behavior already belongs to {@code MatchApplicationService}.
 */
@Service
@RequiredArgsConstructor
public class MatchService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchService.class);

    private final MatchRepository matchRepository;
    private final MatchLiveLinkRepository matchLiveLinkRepository;

    public Match getMatchByIdInternal(Long id) {
        return matchRepository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Match not found", keyValue("matchId", id));
            return new MatchNotFoundException(id);
        });
    }

    @Transactional(readOnly = true)
    public List<MatchLiveSummaryDTO> listMatchesForLiveModeration(LiveLinkStatus statusFilter) {
        return matchRepository.findAllWithLiveLinks().stream()
                .map(match -> summary(match, statusFilter))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(MatchLiveSummaryDTO::getMatchDate).reversed())
                .toList();
    }

    public MatchLiveSummaryDTO toMatchLiveSummaryDTO(Match match) {
        MatchLiveLink lastLink = matchLiveLinkRepository
                .findFirstByMatch_IdOrderByCreatedAtDesc(match.getId())
                .orElse(null);
        return summary(match, lastLink);
    }

    private MatchLiveSummaryDTO summary(Match match, LiveLinkStatus statusFilter) {
        List<MatchLiveLink> links = match.getLiveLinks();
        if (links == null || links.isEmpty()) {
            return null;
        }
        if (statusFilter != null && links.stream().noneMatch(link -> link.getStatus() == statusFilter)) {
            return null;
        }
        MatchLiveLink representative = selectRepresentativeLink(links);
        return representative == null ? null : summary(match, representative);
    }

    private MatchLiveSummaryDTO summary(Match match, MatchLiveLink link) {
        return MatchLiveSummaryDTO.builder()
                .id(match.getId())
                .matchCode(match.getMatchCode())
                .leagueCode(match.getLeagueCode())
                .poolId(match.getPoolId())
                .teamIdA(match.getTeamIdA())
                .teamIdB(match.getTeamIdB())
                .matchDate(match.getMatchDate())
                .season(match.getSeason())
                .set(match.getSet())
                .score(match.getScore())
                .status(match.getStatus())
                .liveCode(match.getLiveCode())
                .lastLiveLinkId(link == null ? null : link.getId())
                .lastLiveLinkStatus(link == null ? null : link.getStatus())
                .lastLiveLinkProvider(link == null ? null : link.getProvider())
                .lastLiveLinkUrl(link == null ? null : link.getUrl())
                .lastLiveLinkOwnerAuth0Id(link == null ? null : link.getOwnerAuth0Id())
                .lastLiveLinkCreatedAt(link == null ? null : link.getCreatedAt())
                .build();
    }

    private MatchLiveLink selectRepresentativeLink(List<MatchLiveLink> links) {
        return links.stream()
                .max(Comparator.comparingInt((MatchLiveLink link) -> statusPriority(link.getStatus()))
                        .thenComparing(MatchLiveLink::getCreatedAt,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private int statusPriority(LiveLinkStatus status) {
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
