package com.blockout.workersearch.configuration.division.outbound;

import com.blockout.workersearch.configclient.api.DivisionsClient;
import com.blockout.workersearch.configuration.division.application.DivisionCatalog;
import com.blockout.workersearch.configuration.division.application.DivisionSnapshot;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ConfigServiceDivisionCatalog implements DivisionCatalog {

    private final DivisionsClient client;
    private final ConfigDivisionMapper mapper;

    @Override
    public List<DivisionSnapshot> findAll() {
        var response = client.listDivisions();
        if (response == null || response.getItems() == null) {
            return List.of();
        }
        return response.getItems().stream().map(mapper::toSnapshot).toList();
    }

    @Override
    public DivisionSnapshot getById(Long id) {
        var response = client.getDivision(id);
        return response == null ? null : mapper.toSnapshot(response);
    }
}
