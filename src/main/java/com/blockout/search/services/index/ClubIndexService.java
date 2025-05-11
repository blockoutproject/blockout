package com.blockout.search.services.index;

import java.util.ArrayList;
import java.util.List;

import com.blockout.search.models.docs.ClubDoc;
import com.blockout.search.models.events.ClubUpsertEvent;
import com.blockout.search.models.events.TeamUpsertEvent;
import com.blockout.search.repositories.ClubRepository;
import com.blockout.search.services.cache.ClubCacheService;
import com.blockout.search.services.cache.TeamCacheService;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubIndexService {

    private static final Logger logger = LoggerFactory.getLogger(ClubIndexService.class);

    private final ClubRepository clubRepository;
    private final ClubCacheService clubCacheService;
    private final TeamCacheService teamCacheService;
    private final TeamIndexService teamIndexService;

    public void upsert(ClubUpsertEvent e) {
        ClubDoc doc = map(e);

        logger.info("Upserting single club",
                keyValue("action", "upsert_club"),
                keyValue("clubId", doc.getClubId()),
                keyValue("name", doc.getName()));

        clubRepository.save(doc);
        clubCacheService.put(e);

        reindexTeamsForClub(doc.getClubId());
    }

    public void upsertBatch(List<ClubUpsertEvent> events) {
        List<ClubDoc> docs = events.stream().map(this::map).toList();

        logger.info("Upserting batch of clubs",
                keyValue("action", "upsert_club_batch"),
                keyValue("count", docs.size()));

        clubRepository.saveAll(docs);
        events.forEach(clubCacheService::put);

        docs.forEach(doc -> {
            logger.debug("Prepared ClubDoc",
                    keyValue("clubId", doc.getClubId()),
                    keyValue("name", doc.getName()),
                    keyValue("city", doc.getCity()));
                    
            reindexTeamsForClub(doc.getClubId());
        });
    }

    public void delete(String id) {
        logger.info("Deleting club",
                keyValue("action", "delete_club"),
                keyValue("clubId", id));
        clubRepository.deleteById(id);
    }

    private ClubDoc map(ClubUpsertEvent e) {
        ClubDoc doc = ClubDoc.builder()
                .clubId(e.getClubId())
                .name(e.getName())
                .city(e.getCity())
                .build();

        logger.debug("Mapped ClubUpsertEvent to ClubDoc",
                keyValue("action", "map_club_event"),
                keyValue("clubId", doc.getClubId()),
                keyValue("name", doc.getName()),
                keyValue("city", doc.getCity()));

        return doc;
    }

    private void reindexTeamsForClub(String clubId) {
        List<TeamUpsertEvent> events = new ArrayList<>(teamCacheService.getTeamsByClubId(clubId)); // Copie défensive ici

        if (events.isEmpty()) {
            logger.warn("No teams found for club during reindex",
                    keyValue("action", "reindex_teams_for_club"),
                    keyValue("clubId", clubId));
            return;
        }
    
        teamIndexService.upsertBatch(events);
    
        logger.info("Reindexed teams for club",
                keyValue("action", "reindex_teams_for_club"),
                keyValue("clubId", clubId),
                keyValue("teamCount", events.size()));
    }
}