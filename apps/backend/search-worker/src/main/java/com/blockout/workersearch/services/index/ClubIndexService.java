package com.blockout.workersearch.services.index;

import lombok.RequiredArgsConstructor;
import org.slf4j.*;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.docs.ClubDoc;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.projection.snapshot.application.ClubCacheSnapshot;
import com.blockout.workersearch.projection.snapshot.application.ClubProjectionCache;
import com.blockout.workersearch.projection.snapshot.application.TeamCacheSnapshot;
import com.blockout.workersearch.projection.snapshot.application.TeamProjectionCache;
import com.blockout.workersearch.repositories.ClubRepository;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubIndexService {

    private static final Logger logger = LoggerFactory.getLogger(ClubIndexService.class);

    private final ClubRepository clubRepository;
    private final ClubProjectionCache clubCache;
    private final TeamProjectionCache teamCache;
    private final TeamIndexService teamIndexService;

    public void upsert(ClubUpsertEvent e) {
        ClubDoc doc = map(e);
        logger.info("Upserting single club",
                keyValue("action","upsert_club"),
                keyValue("id", doc.getId()),
                keyValue("name", doc.getName()));
        clubRepository.save(doc);
        clubCache.put(toCacheSnapshot(e));
        reindexTeamsForClub(doc.getId());
    }

    public void upsertBatch(List<ClubUpsertEvent> events) {
        List<ClubDoc> docs = events.stream().map(this::map).toList();
        logger.info("Upserting batch of clubs",
                keyValue("action","upsert_club_batch"),
                keyValue("count", docs.size()));
        clubRepository.saveAll(docs);
        events.stream().map(this::toCacheSnapshot).forEach(clubCache::put);
        docs.forEach(d -> reindexTeamsForClub(d.getId()));
    }

    public void delete(String id) {
        logger.info("Deleting club", keyValue("action","delete_club"), keyValue("id", id));
        clubRepository.deleteById(id);
        clubCache.remove(id);
        teamCache.removeClub(id);
    }

    public void deleteAll() {
        logger.info("Deleting all clubs", keyValue("action", "delete_all_clubs"));
        clubRepository.deleteAll();
    }

    private ClubDoc map(ClubUpsertEvent e) {
        return ClubDoc.builder()
                .id(e.getId())
                .name(e.getName())
                .city(e.getCity())
                .logoUrl(e.getLogoUrl())
                .build();
    }

    private ClubCacheSnapshot toCacheSnapshot(ClubUpsertEvent event) {
        return new ClubCacheSnapshot(event.getId(), event.getName(), event.getLogoUrl(), event.getCity());
    }

    private void reindexTeamsForClub(String clubId) {
        List<TeamCacheSnapshot> teams = teamCache.getByClubId(clubId);
        teamIndexService.upsertCachedBatch(teams);
    }
}
