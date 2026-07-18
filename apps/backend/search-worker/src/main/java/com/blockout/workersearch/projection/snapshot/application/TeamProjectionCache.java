package com.blockout.workersearch.projection.snapshot.application;

import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class TeamProjectionCache {

    private final AtomicSnapshotMap<Long, TeamCacheSnapshot> snapshots = new AtomicSnapshotMap<>();

    public List<TeamCacheSnapshot> getByClubId(String clubId) {
        return snapshots.values().stream()
                .filter(team -> Objects.equals(team.clubId(), clubId))
                .toList();
    }

    public int size() {
        return snapshots.size();
    }

    public long clubCount() {
        return snapshots.values().stream().map(TeamCacheSnapshot::clubId).distinct().count();
    }

    public void put(TeamCacheSnapshot team) {
        snapshots.put(team.id(), team);
    }

    public void removeTeam(Long id) {
        snapshots.remove(id);
    }

    public void removeClub(String clubId) {
        snapshots.removeIf(team -> Objects.equals(team.clubId(), clubId));
    }

    public void replaceAll(List<TeamCacheSnapshot> teams) {
        snapshots.replaceAll(teams, TeamCacheSnapshot::id);
    }
}
