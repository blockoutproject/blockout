package com.blockout.workersearch.services.cache;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.TeamUpsertEvent;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamCacheService {

    private static final Logger logger = LoggerFactory.getLogger(TeamCacheService.class);
    private final Map<String, List<TeamUpsertEvent>> teamCacheByClub = new ConcurrentHashMap<>();

    public List<TeamUpsertEvent> getTeamsByClubId(String clubId) {
        return teamCacheByClub.getOrDefault(clubId, Collections.emptyList());
    }

    public void put(TeamUpsertEvent event) {
        teamCacheByClub
                .computeIfAbsent(event.getClubId(), k -> new ArrayList<>())
                .add(event);
        logger.debug("Inserted team in cache from event",
                keyValue("teamId", event.getTeamId()),
                keyValue("clubId", event.getClubId()));
    }

    public void replaceAll(List<TeamUpsertEvent> events) {
        teamCacheByClub.clear();
        events.forEach(this::put);
    }

    public Map<String, List<TeamUpsertEvent>> getAllTeamCache() {
        return Collections.unmodifiableMap(teamCacheByClub);
    }
}