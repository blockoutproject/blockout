package com.blockout.workersearch.services.caches;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.ClubUpsertEvent;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ClubCacheService {

    private final Map<String, ClubUpsertEvent> clubCache = new ConcurrentHashMap<>();

    public ClubUpsertEvent getClubById(String id) {
        return clubCache.get(id);
    }

    public Collection<ClubUpsertEvent> getAllClubs() {
        return clubCache.values();
    }

    public void put(ClubUpsertEvent event) {
        clubCache.put(event.getId(), event);
    }

    public void replaceAll(List<ClubUpsertEvent> events) {
        clubCache.clear();
        events.forEach(this::put);
    }
}