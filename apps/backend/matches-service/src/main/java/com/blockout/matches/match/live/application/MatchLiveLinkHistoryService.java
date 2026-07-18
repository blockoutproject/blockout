package com.blockout.matches.match.live.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchLiveLinkHistoryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchLiveLinkHistoryService.class);

    private final MatchLiveLinkHistoryStore liveLinks;
    private final MatchLiveLinkProjector projector;

    @Transactional(readOnly = true)
    public MatchLiveLinkHistoryPage findHistory(Long matchId, int page, int pageSize) {
        MatchLiveLinkStatePage result = liveLinks.findHistory(matchId, page, pageSize);
        return new MatchLiveLinkHistoryPage(result.items().stream().map(projector::toHistoryItem).toList(),
                page, pageSize, result.totalItems(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public List<MatchLiveLinkHistoryItemView> findAllHistory(Long matchId) {
        List<MatchLiveLinkHistoryItemView> result = liveLinks.findAllHistory(matchId).stream()
                .map(projector::toHistoryItem)
                .toList();
        if (result.isEmpty()) {
            LOGGER.info("No live links found for match", keyValue("action", "get_live_links_history"),
                    keyValue("match_id", matchId));
        }
        return result;
    }
}
