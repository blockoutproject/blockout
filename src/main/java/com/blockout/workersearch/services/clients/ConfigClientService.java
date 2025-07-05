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

    /**
     * Récupère toutes les divisions depuis l'API config.
     */
    public List<DivisionDTO> listDivisions() {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions";

        logger.info("Calling listDivisions endpoint",
                keyValue("action", "call_config_list_divisions"),
                keyValue("url", url));

        try {
            ResponseEntity<DivisionDTO[]> response = apiClientService.get(url, DivisionDTO[].class);
            DivisionDTO[] body = response.getBody();
            List<DivisionDTO> divisions = body != null ? Arrays.asList(body) : Collections.emptyList();

            logger.info("Successfully fetched divisions",
                    keyValue("count", divisions.size()));

            return divisions;
        } catch (Exception e) {
            logger.error("Failed to fetch divisions from Config API",
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            return Collections.emptyList();
        }
    }

    /**
     * Récupère une division par ID.
     */
    public DivisionDTO getDivisionById(Long id) {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions/" + id;

        logger.info("Calling getDivisionById",
                keyValue("action", "call_config_get_division_by_id"),
                keyValue("id", id),
                keyValue("url", url));

        try {
            ResponseEntity<DivisionDTO> response = apiClientService.get(url, DivisionDTO.class);
            return response.getBody();
        } catch (Exception e) {
            logger.error("Failed to fetch division by ID from Config API",
                    keyValue("id", id),
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            return null;
        }
    }
}