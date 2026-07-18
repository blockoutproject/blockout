package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.*;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.TeamDoc;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.projection.snapshot.application.ClubCacheSnapshot;
import com.blockout.workersearch.projection.snapshot.application.ClubProjectionCache;
import com.blockout.workersearch.projection.snapshot.application.DivisionCacheSnapshot;
import com.blockout.workersearch.projection.snapshot.application.DivisionProjectionCache;
import com.blockout.workersearch.projection.snapshot.application.TeamCacheSnapshot;
import com.blockout.workersearch.projection.snapshot.application.TeamProjectionCache;
import com.blockout.workersearch.repositories.TeamRepository;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamIndexService {

    private static final Logger logger = LoggerFactory.getLogger(TeamIndexService.class);

    private final TeamRepository teamRepository;
    private final TeamProjectionCache teamCache;
    private final ClubProjectionCache clubCache;
    private final DivisionProjectionCache divisionCache;

    public void upsert(TeamUpsertEvent e) {
        TeamDoc doc = map(e);
        logger.info("Upserting single team",
                keyValue("action", "upsert_team"),
                keyValue("id", doc.getId()),
                keyValue("name", doc.getName()));
        teamRepository.save(doc);
        teamCache.put(toCacheSnapshot(e));
    }

    public void upsertBatch(List<TeamUpsertEvent> events) {
        List<TeamDoc> docs = events.stream().map(this::map).toList();
        logger.info("Upserting batch of teams",
                keyValue("action", "upsert_team_batch"),
                keyValue("count", docs.size()));
        teamRepository.saveAll(docs);
        events.stream().map(this::toCacheSnapshot).forEach(teamCache::put);
    }

    public void upsertCachedBatch(List<TeamCacheSnapshot> teams) {
        List<TeamDoc> docs = teams.stream().map(this::map).toList();
        logger.info("Upserting cached batch of teams",
                keyValue("action", "upsert_cached_team_batch"),
                keyValue("count", docs.size()));
        teamRepository.saveAll(docs);
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
        return map(toCacheSnapshot(e));
    }

    private TeamDoc map(TeamCacheSnapshot team) {
        ClubCacheSnapshot club = clubCache.getById(team.clubId());
        DivisionCacheSnapshot division = divisionCache.getById(team.divisionId());

        String clubName = club != null ? club.name() : null;
        String clubCity = club != null ? club.city() : null;
        String clubLogoUrl = club != null ? club.logoUrl() : null;

        String logoUrl = StringUtils.isNotBlank(team.logoUrl())
                ? team.logoUrl()
                : clubLogoUrl;

        String divisionName = division != null ? division.name() : "Division inconnue";
        Long divisionId = division != null ? division.id() : null;
        FormatEnum format = team.format();
        GenderEnum gender = team.gender();

        return TeamDoc.builder()
                .id(team.id())
                .name(team.name())
                .shortName(team.shortName())
                .clubId(team.clubId())
                .clubName(clubName)
                .clubCity(clubCity)
                .logoUrl(logoUrl)
                .divisionId(divisionId)
                .divisionName(divisionName)
                .format(format.name())
                .gender(gender.name())
                .season(team.season())
                .build();
    }

    private TeamCacheSnapshot toCacheSnapshot(TeamUpsertEvent event) {
        return new TeamCacheSnapshot(
                event.getId(),
                event.getName(),
                event.getShortName(),
                event.getClubId(),
                event.getDivisionId(),
                event.getFormat(),
                event.getGender(),
                event.getSeason(),
                event.getLogoUrl());
    }
}
