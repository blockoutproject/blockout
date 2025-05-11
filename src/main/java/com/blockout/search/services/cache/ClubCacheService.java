package com.blockout.search.services.cache;
import com.blockout.search.models.events.ClubUpsertEvent;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubCacheService {

    private static final Logger logger = LoggerFactory.getLogger(ClubCacheService.class);
    private final Map<String, ClubUpsertEvent> clubCache = new ConcurrentHashMap<>();

    public ClubUpsertEvent getClubById(String id) {
        return clubCache.get(id);
    }

    public Collection<ClubUpsertEvent> getAllClubs() {
        return clubCache.values();
    }

    public void put(ClubUpsertEvent event) {
        clubCache.put(event.getClubId(), event);
        logger.debug("Inserted club in cache from event",
                keyValue("clubId", event.getClubId()),
                keyValue("name", event.getName()),
                keyValue("city", event.getCity()));
    }

    public void replaceAll(List<ClubUpsertEvent> events) {
        clubCache.clear();
        events.forEach(this::put);
    }
}