package com.blockout.workersearch.projection.snapshot.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DivisionProjectionCache {

    private final AtomicSnapshotMap<Long, DivisionCacheSnapshot> snapshots = new AtomicSnapshotMap<>();

    public DivisionCacheSnapshot getById(Long id) {
        return snapshots.get(id);
    }

    public List<DivisionCacheSnapshot> getAll() {
        return snapshots.values();
    }

    public int size() {
        return snapshots.size();
    }

    public void replaceAll(List<DivisionCacheSnapshot> divisions) {
        snapshots.replaceAll(divisions, DivisionCacheSnapshot::id);
    }
}
