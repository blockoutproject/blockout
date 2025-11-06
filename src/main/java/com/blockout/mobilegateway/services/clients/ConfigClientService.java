package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentDTO;
import com.blockout.mobilegateway.models.dto.config.LegalDocumentUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.ScraperStatusDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

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
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getConfig().getUrl() + "/divisions";
    }

    public List<DivisionDTO> listDivisions() {
        String url = baseUrl();
        logger.info("Calling config#listDivisions", keyValue("url", url));

        ResponseEntity<DivisionDTO[]> response = apiClientService.get(url, DivisionDTO[].class);
        DivisionDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    public DivisionDTO getDivisionById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        logger.info("Calling config#getDivisionById", keyValue("id", id), keyValue("url", url));

        ResponseEntity<DivisionDTO> response = apiClientService.get(url, DivisionDTO.class);
        return response.getBody();
    }

    public DivisionDTO createDivision(DivisionUpdateDTO dto, MultipartFile image) {
        String url = baseUrl();
        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        logger.info("Calling config#createDivision", keyValue("url", url));

        ResponseEntity<DivisionDTO> response = apiClientService.postMultipart(url, body, DivisionDTO.class);
        return response.getBody();
    }

    public DivisionDTO updateDivision(Long id, DivisionUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);
        logger.info("Calling config#updateDivision", keyValue("id", id), keyValue("url", url));

        ResponseEntity<DivisionDTO> response = apiClientService.putMultipart(url, body, DivisionDTO.class);
        return response.getBody();
    }

    public void deactivateDivision(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id.toString())
                .build()
                .toUriString();

        logger.info("Calling config#deactivateDivision", keyValue("id", id), keyValue("url", url));
        apiClientService.delete(url, Void.class);
    }

    public LegalDocumentDTO getLegalDocument(String type) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("legal", type)
                .build()
                .toUriString();

        logger.info("Calling config#getLegalDocument",
                keyValue("url", url),
                keyValue("type", type));

        ResponseEntity<LegalDocumentDTO> res = apiClientService.get(url, LegalDocumentDTO.class);
        return res.getBody();
    }

    public LegalDocumentDTO updateLegalDocument(String type, LegalDocumentUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("legal", type)
                .build()
                .toUriString();

        logger.info("Calling config#updateLegalDocument",
                keyValue("url", url),
                keyValue("type", type));

        ResponseEntity<LegalDocumentDTO> res = apiClientService.put(url, dto, LegalDocumentDTO.class);
        return res.getBody();
    }

    public RawDivisionMappingDTO createRawDivisionMapping(RawDivisionMappingDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions")
                .build()
                .toUriString();

        logger.info("Calling config#rawDivision#create", keyValue("url", url));
        return apiClientService.post(url, dto, RawDivisionMappingDTO.class).getBody();
    }

    public List<RawDivisionMappingDTO> listRawDivisionMappings(String leagueCode, String season) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions")
                .queryParamIfPresent("league_code", java.util.Optional.ofNullable(leagueCode))
                .queryParamIfPresent("season", java.util.Optional.ofNullable(season))
                .build()
                .toUriString();

        logger.info("Calling config#rawDivision#list",
                keyValue("leagueCode", leagueCode),
                keyValue("season", season),
                keyValue("url", url));

        ResponseEntity<RawDivisionMappingDTO[]> res = apiClientService.get(url, RawDivisionMappingDTO[].class);
        return res.getBody() != null ? java.util.Arrays.asList(res.getBody()) : java.util.Collections.emptyList();
    }

    public RawDivisionMappingDTO getRawDivisionMappingById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions", id.toString())
                .build()
                .toUriString();

        logger.info("Calling config#rawDivision#getById", keyValue("id", id), keyValue("url", url));
        return apiClientService.get(url, RawDivisionMappingDTO.class).getBody();
    }

    public RawDivisionMappingDTO updateRawDivisionMapping(Long id, RawDivisionMappingUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions", id.toString())
                .build()
                .toUriString();

        logger.info("Calling config#rawDivision#update", keyValue("id", id), keyValue("url", url));
        return apiClientService.put(url, dto, RawDivisionMappingDTO.class).getBody();
    }

    public ScraperStatusDTO updateScraperStatus(String name, boolean enabled) {
        String url = UriComponentsBuilder.fromUriString(apiClientProperties.getConfig().getUrl())
                .pathSegment("scrapers", name, "enabled")
                .queryParam("enabled", enabled)
                .build()
                .toUriString();

        logger.info("Calling config#updateScraperStatus",
                keyValue("action", "call_config_update_scraper_status"),
                keyValue("name", name),
                keyValue("enabled", enabled),
                keyValue("url", url));

        ResponseEntity<ScraperStatusDTO> response = apiClientService.put(url, null, ScraperStatusDTO.class);
        return response.getBody();
    }

    public List<ScraperStatusDTO> listScraperStatuses() {
        String url = UriComponentsBuilder.fromUriString(apiClientProperties.getConfig().getUrl())
                .pathSegment("scrapers", "status")
                .build()
                .toUriString();

        logger.info("Calling config#listScraperStatuses",
                keyValue("action", "call_config_list_scraper_statuses"),
                keyValue("url", url));

        ResponseEntity<ScraperStatusDTO[]> response = apiClientService.get(url, ScraperStatusDTO[].class);
        ScraperStatusDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}