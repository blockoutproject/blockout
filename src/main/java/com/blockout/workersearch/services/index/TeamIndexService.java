package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.TeamDoc;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.repositories.TeamRepository;
import com.blockout.workersearch.services.caches.ClubCacheService;
import com.blockout.workersearch.services.caches.TeamCacheService;
import com.blockout.workersearch.utils.TextNormalizer;

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

        String name = e.getName();
        String clubName = club != null ? club.getName() : null;
        String clubCity = club != null ? club.getCity() : null;
        String divisionName = e.getDivisionName();
        String format = e.getFormat();
        String gender = e.getGender();

        return TeamDoc.builder()
                .id(e.getId())
                .name(name)
                .clubId(e.getClubId())
                .clubName(clubName)
                .clubCity(clubCity)
                .divisionName(divisionName)
                .format(format)
                .gender(gender)
                .nameSimplified(TextNormalizer.simplify(name))
                .clubNameSimplified(TextNormalizer.simplify(clubName))
                .clubCitySimplified(TextNormalizer.simplify(clubCity))
                .divisionNameSimplified(TextNormalizer.simplify(divisionName))
                .keywords(TextNormalizer.simplify(
                        name + " " +
                                clubName + " " +
                                clubCity + " " +
                                divisionName + " " +
                                format + " " +
                                gender))
                .build();
    }
}