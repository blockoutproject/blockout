package com.blockout.workersearch.services.caches;

import com.blockout.workersearch.models.dto.config.DivisionDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ConfigCacheService {

    private final Map<Long, DivisionDTO> divisionCache = new ConcurrentHashMap<>();

    public DivisionDTO getDivisionById(Long id) {
        return divisionCache.get(id);
    }

    public Collection<DivisionDTO> getDivisions() {
        return divisionCache.values();
    }

    public void putDivision(DivisionDTO dto) {
        divisionCache.put(dto.getId(), dto);
    }

    public void replaceDivisions(List<DivisionDTO> dtos) {
        divisionCache.clear();
        dtos.forEach(this::putDivision);
    }
}