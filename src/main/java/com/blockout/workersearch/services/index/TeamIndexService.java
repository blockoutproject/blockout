package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;
import org.slf4j.*;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.TeamDoc;
import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.DivisionUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.repositories.TeamRepository;
import com.blockout.workersearch.services.caches.ClubCacheService;
import com.blockout.workersearch.services.caches.ConfigCacheService;
import com.blockout.workersearch.services.caches.TeamCacheService;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamIndexService {

    private static final Logger logger = LoggerFactory.getLogger(TeamIndexService.class);

    private final TeamRepository teamRepository;
    private final TeamCacheService teamCacheService;
    private final ClubCacheService clubCacheService;
    private final ConfigCacheService configCacheService;

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
        List<TeamDoc> docs = events.stream().map(this::map).toList();
        logger.info("Upserting batch of teams",
                keyValue("action", "upsert_team_batch"),
                keyValue("count", docs.size()));
        teamRepository.saveAll(docs);
        events.forEach(teamCacheService::put);
    }

    public void delete(Long id) {
        logger.info("Deleting team", keyValue("action", "delete_team"), keyValue("id", id));
        teamRepository.deleteById(id);
    }

    public void deleteAll() {
        logger.info("Deleting all teams", keyValue("action", "delete_all_teams"));
        teamRepository.deleteAll();
    }

    private TeamDoc map(TeamUpsertEvent e) {
        ClubUpsertEvent club = clubCacheService.getClubById(e.getClubId());
        DivisionUpsertEvent division = configCacheService.getDivisionById(e.getDivisionId());

        String clubName = club != null ? club.getName() : null;
        String clubCity = club != null ? club.getCity() : null;
        String logoUrl = club != null ? club.getLogoUrl() : null;
        String divisionName = division != null ? division.getName() : "Division inconnue";
        Format format = e.getFormat();
        Gender gender = e.getGender();

        return TeamDoc.builder()
                .id(e.getId())
                .name(e.getName())
                .shortName(e.getShortName())
                .clubId(e.getClubId())
                .clubName(clubName)
                .clubCity(clubCity)
                .logoUrl(logoUrl)
                .divisionName(divisionName)
                .format(format != null ? format.getLabel() : null)
                .gender(gender != null ? gender.getLabel() : null)
                .season(e.getSeason())
                .build();
    }
}