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
                keyValue("teamId", doc.getTeamId()),
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

        docs.forEach(doc -> logger.info("Prepared TeamDoc",
                keyValue("teamId", doc.getTeamId()),
                keyValue("clubId", doc.getClubId()),
                keyValue("clubName", doc.getClubName()),
                keyValue("clubCity", doc.getClubCity()),
                keyValue("name", doc.getName()),
                keyValue("division", doc.getDivisionName()),
                keyValue("format", doc.getFormat()),
                keyValue("gender", doc.getGender())));

        teamRepository.saveAll(docs);
        events.forEach(teamCacheService::put);
    }

    public void delete(Long id) {
        logger.info("Deleting team",
                keyValue("action", "delete_team"),
                keyValue("teamId", id));
        teamRepository.deleteById(id);
    }

    private TeamDoc map(TeamUpsertEvent e) {
        ClubUpsertEvent club = clubCacheService.getClubById(e.getClubId());

        if (club == null) {
            logger.warn("Club not found in cache during team mapping",
                    keyValue("action", "missing_club_in_cache"),
                    keyValue("teamId", e.getTeamId()),
                    keyValue("clubId", e.getClubId()));
        }

        return TeamDoc.builder()
                .teamId(e.getTeamId())
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