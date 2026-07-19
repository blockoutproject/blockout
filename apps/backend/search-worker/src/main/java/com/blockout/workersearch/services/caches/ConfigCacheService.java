package com.blockout.workersearch.services.caches;

import com.blockout.workersearch.models.events.DivisionUpsertEvent;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ConfigCacheService {

    private final Map<Long, DivisionUpsertEvent> divisionCache = new ConcurrentHashMap<>();

    public DivisionUpsertEvent getDivisionById(Long id) {
        return divisionCache.get(id);
    }

    public Collection<DivisionUpsertEvent> getDivisions() {
        return divisionCache.values();
    }

    public void putDivision(DivisionUpsertEvent dto) {
        divisionCache.put(dto.getId(), dto);
    }

    public void replaceDivisions(List<DivisionUpsertEvent> dtos) {
        divisionCache.clear();
        dtos.forEach(this::putDivision);
    }
}