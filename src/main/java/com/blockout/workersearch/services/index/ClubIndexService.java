package com.blockout.workersearch.services.index;

import java.util.ArrayList;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.ClubDoc;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.repositories.ClubRepository;
import com.blockout.workersearch.services.caches.ClubCacheService;
import com.blockout.workersearch.services.caches.TeamCacheService;
import com.blockout.workersearch.utils.TextNormalizer;

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
                keyValue("id", doc.getId()),
                keyValue("name", doc.getName()));

        clubRepository.save(doc);
        clubCacheService.put(e);

        reindexTeamsForClub(doc.getId());
    }

    public void upsertBatch(List<ClubUpsertEvent> events) {
        List<ClubDoc> docs = events.stream().map(this::map).toList();

        logger.info("Upserting batch of clubs",
                keyValue("action", "upsert_club_batch"),
                keyValue("count", docs.size()));

        clubRepository.saveAll(docs);
        events.forEach(clubCacheService::put);

        docs.forEach(doc -> {
            reindexTeamsForClub(doc.getId());
        });
    }

    public void delete(String id) {
        logger.info("Deleting club",
                keyValue("action", "delete_club"),
                keyValue("id", id));
        clubRepository.deleteById(id);
    }

    private ClubDoc map(ClubUpsertEvent e) {
        String name = e.getName();
        String city = e.getCity();

        // Contenu brut
        String raw = String.join(" ",
                name != null ? name : "",
                city != null ? city : "");

        // Contenu simplifié
        String simplified = TextNormalizer.simplify(raw);

        ClubDoc doc = ClubDoc.builder()
                .id(e.getId())
                .name(e.getName())
                .city(e.getCity())
                .keywordsAutocomplete(raw)
                .keywordsAutocompleteSimplified(simplified)
                .build();
        return doc;
    }

    private void reindexTeamsForClub(String clubId) {
        List<TeamUpsertEvent> events = new ArrayList<>(teamCacheService.getTeamsByClubId(clubId));
        teamIndexService.upsertBatch(events);
    }
}