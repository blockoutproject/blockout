package com.blockout.workersearch.projection.snapshot.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ClubProjectionCache {

    private final AtomicSnapshotMap<String, ClubCacheSnapshot> snapshots = new AtomicSnapshotMap<>();

    public ClubCacheSnapshot getById(String id) {
        return snapshots.get(id);
    }

    public List<ClubCacheSnapshot> getAll() {
        return snapshots.values();
    }

    public int size() {
        return snapshots.size();
    }

    public void put(ClubCacheSnapshot club) {
        snapshots.put(club.id(), club);
    }

    public void remove(String id) {
        snapshots.remove(id);
    }

    public void replaceAll(List<ClubCacheSnapshot> clubs) {
        snapshots.replaceAll(clubs, ClubCacheSnapshot::id);
    }
}
