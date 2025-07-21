package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
        DivisionUpsertEvent division = configCacheService.getDivisionById(e.getDivisionId());

        String name = e.getName();
        String clubName = club != null ? club.getName() : null;
        String clubCity = club != null ? club.getCity() : null;
        String logoUrl = club != null ? club.getLogoUrl() : null;
        String divisionName = division != null ? division.getName() : "Division inconnue";
        Format format = e.getFormat();
        Gender gender = e.getGender();

        // Contenu brut
        String raw = String.join(" ",
                name != null ? name : "",
                clubName != null ? clubName : "",
                clubCity != null ? clubCity : "",
                divisionName,
                format != null ? format.getLabel() : "",
                gender != null ? gender.getLabel() : "");

        // Contenu simplifié
        String simplified = TextNormalizer.simplify(raw);

        return TeamDoc.builder()
                .id(e.getId())
                .name(name)
                .clubId(e.getClubId())
                .clubName(clubName)
                .clubCity(clubCity)
                .logoUrl(logoUrl)
                .divisionName(divisionName)
                .format(format != null ? format.getLabel() : null)
                .gender(gender != null ? gender.getLabel() : null)
                .season(e.getSeason())
                .keywordsAutocomplete(raw)
                .keywordsAutocompleteSimplified(simplified)
                .build();
    }
}