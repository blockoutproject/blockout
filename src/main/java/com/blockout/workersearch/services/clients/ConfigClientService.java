package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.config.DivisionDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfigClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<DivisionDTO> listDivisions() {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions";

        ResponseEntity<DivisionDTO[]> response = apiClientService.get(url, DivisionDTO[].class);
        DivisionDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public DivisionDTO getDivisionById(Long id) {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions/" + id;

        ResponseEntity<DivisionDTO> response = apiClientService.get(url, DivisionDTO.class);
        return response.getBody();
    }
}