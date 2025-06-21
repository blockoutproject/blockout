package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.TeamDoc;
import com.blockout.workersearch.models.enums.DivisionCode;
import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;
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
        DivisionCode divisionCode = e.getDivisionCode();
        Format format = e.getFormat();
        Gender gender = e.getGender();

        // Contenu brut
        String raw = String.join(" ", name, clubName, clubCity, divisionCode.getLabel(), format.getLabel(), gender.getLabel());

        // Contenu simplifié
        String simplified = TextNormalizer.simplify(raw);

        return TeamDoc.builder()
                .id(e.getId())
                .name(name)
                .clubId(e.getClubId())
                .clubName(clubName)
                .clubCity(clubCity)
                .divisionName(divisionCode.getLabel())
                .format(format.getLabel())
                .gender(gender.getLabel())
                .keywordsAutocomplete(raw)
                .keywordsAutocompleteSimplified(simplified)
                .build();
    }
}