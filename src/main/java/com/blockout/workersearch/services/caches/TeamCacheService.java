package com.blockout.workersearch.services.caches;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.TeamUpsertEvent;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;


@Service
@RequiredArgsConstructor
public class TeamCacheService {

    private final Map<String, List<TeamUpsertEvent>> teamCacheByClub = new ConcurrentHashMap<>();

    public List<TeamUpsertEvent> getTeamsByClubId(String clubId) {
        return teamCacheByClub.getOrDefault(clubId, Collections.emptyList());
    }

    public void put(TeamUpsertEvent event) {
        teamCacheByClub
                .computeIfAbsent(event.getClubId(), k -> new ArrayList<>())
                .add(event);
    }

    public void replaceAll(List<TeamUpsertEvent> events) {
        teamCacheByClub.clear();
        events.forEach(this::put);
    }

    public Map<String, List<TeamUpsertEvent>> getAllTeamCache() {
        return Collections.unmodifiableMap(teamCacheByClub);
    }
}