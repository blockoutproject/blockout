package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.TeamDoc;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.repositories.TeamRepository;
import com.blockout.workersearch.services.cache.ClubCacheService;
import com.blockout.workersearch.services.cache.TeamCacheService;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamIndexService {

    private static final Logger logger = LoggerFactory.getLogger(TeamIndexService.class);

    private final TeamRepository teamRepository;
    private final TeamCacheService teamCacheService;
    private final ClubCacheService clubCacheService;

    public void upsert(TeamUpsertEvent e) {
        TeamDoc doc = map(e);
        logger.info("Upserting single team",
                keyValue("action", "upsert_team"),
                keyValue("id", doc.getId()),
                keyValue("name", doc.getName()));
        teamRepository.save(doc);
        teamCacheService.put(e);
    }

    public void upsertBatch(List<TeamUpsertEvent> events) {
        List<TeamDoc> docs = events.stream()
                .map(this::map)
                .toList();

        logger.info("Upserting batch of teams",
                keyValue("action", "upsert_team_batch"),
                keyValue("count", docs.size()));

        teamRepository.saveAll(docs);
        events.forEach(teamCacheService::put);
    }

    public void delete(Long id) {
        logger.info("Deleting team",
                keyValue("action", "delete_team"),
                keyValue("id", id));
        teamRepository.deleteById(id);
    }

    private TeamDoc map(TeamUpsertEvent e) {
        ClubUpsertEvent club = clubCacheService.getClubById(e.getClubId());

        if (club == null) {
            logger.warn("Club not found in cache during team mapping",
                    keyValue("action", "missing_club_in_cache"),
                    keyValue("id", e.getId()),
                    keyValue("clubId", e.getClubId()));
        }

        return TeamDoc.builder()
                .id(e.getId())
                .name(e.getName())
                .clubId(e.getClubId())
                .clubName(club != null ? club.getName() : null)
                .clubCity(club != null ? club.getCity() : null)
                .divisionName(e.getDivisionName())
                .format(e.getFormat())
                .gender(e.getGender())
                .build();
    }
}