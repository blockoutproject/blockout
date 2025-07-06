package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.exceptions.DivisionNotFoundException;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

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

        try {
            ResponseEntity<DivisionDTO[]> response = apiClientService.get(url, DivisionDTO[].class);
            DivisionDTO[] body = response.getBody();
            return body != null ? Arrays.asList(body) : Collections.emptyList();
        } catch (Exception e) {
            logger.error("Failed to fetch divisions from Config API",
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération des divisions", e);
        }
    }

    public DivisionDTO getDivisionById(Long id) {
        String url = apiClientProperties.getConfig().getUrl() + "/divisions/" + id;

        logger.info("Calling getDivisionById",
                keyValue("action", "call_config_get_division_by_id"),
                keyValue("id", id),
                keyValue("url", url));

        try {
            ResponseEntity<DivisionDTO> response = apiClientService.get(url, DivisionDTO.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            logger.warn("Division not found", keyValue("id", id));
            throw new DivisionNotFoundException(id);
        } catch (Exception e) {
            logger.error("Failed to fetch division by ID from Config API",
                    keyValue("id", id),
                    keyValue("url", url),
                    keyValue("error", e.getMessage()), e);
            throw new RuntimeException("Erreur lors de la récupération de la division", e);
        }
    }
}