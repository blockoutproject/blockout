package com.blockout.workersearch.services.clients;

import com.blockout.workersearch.config.ApiClientProperties;
import com.blockout.workersearch.models.dto.config.DivisionDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ConfigClientService {

    private static final Logger logger = LoggerFactory.getLogger(ConfigClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public List<DivisionDTO> listDivisions() {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions";

        logger.info("Calling listDivisions endpoint",
                keyValue("action", "call_config_list_divisions"),
                keyValue("url", url));

        ResponseEntity<DivisionDTO[]> response = apiClientService.get(url, DivisionDTO[].class);
        DivisionDTO[] body = response.getBody();

        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public DivisionDTO getDivisionById(Long id) {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions/" + id;

        logger.info("Calling getDivisionById",
                keyValue("action", "call_config_get_division_by_id"),
                keyValue("id", id),
                keyValue("url", url));

        ResponseEntity<DivisionDTO> response = apiClientService.get(url, DivisionDTO.class);
        return response.getBody();
    }
}