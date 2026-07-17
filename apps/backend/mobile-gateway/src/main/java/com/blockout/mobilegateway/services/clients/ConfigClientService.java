package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.config.AppStatusDTO;
import com.blockout.mobilegateway.models.dto.config.AppStatusUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionDTO;
import com.blockout.mobilegateway.models.dto.config.DivisionUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingUpdateDTO;
import com.blockout.mobilegateway.models.dto.config.ScraperStatusDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
import com.blockout.mobilegateway.shared.api.v1.LegacyMobileGatewayJson;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfigClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final LegacyMobileGatewayJson legacyJson;

    private String baseUrl() {
        return apiClientProperties.getConfig().getUrl();
    }

    public AppStatusDTO getAppStatus() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("app-status")
                .build()
                .toUriString();

        ResponseEntity<AppStatusDTO> res = apiClientService.get(url, AppStatusDTO.class);
        return res.getBody();
    }

    public AppStatusDTO updateAppStatus(AppStatusUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("app-status")
                .build()
                .toUriString();

        ResponseEntity<AppStatusDTO> res = apiClientService.put(url, dto, AppStatusDTO.class);
        return res.getBody();
    }

    @Cacheable(value = "divisions")
    public List<DivisionDTO> listDivisions() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions")
                .build()
                .toUriString();

        ResponseEntity<DivisionDTO[]> response = apiClientService.get(url, DivisionDTO[].class);
        DivisionDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Cacheable(value = "divisionById", key = "#id")
    public DivisionDTO getDivisionById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions", id.toString())
                .build()
                .toUriString();

        ResponseEntity<DivisionDTO> response = apiClientService.get(url, DivisionDTO.class);
        return response.getBody();
    }

    public DivisionDTO createDivision(DivisionUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions")
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(legacyJson, dto, image);

        ResponseEntity<DivisionDTO> response = apiClientService.postMultipart(url, body, DivisionDTO.class);
        return response.getBody();
    }

    @Caching(put = {
            @CachePut(value = "divisionById", key = "#id")
    }, evict = {
            @CacheEvict(value = "divisions")
    })
    public DivisionDTO updateDivision(Long id, DivisionUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions", id.toString())
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(legacyJson, dto, image);

        ResponseEntity<DivisionDTO> response = apiClientService.putMultipart(url, body, DivisionDTO.class);
        return response.getBody();
    }

    @Caching(evict = {
            @CacheEvict(value = "divisionById", key = "#id"),
            @CacheEvict(value = "divisions")
    })
    public void deactivateDivision(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions", id.toString())
                .build()
                .toUriString();

        apiClientService.delete(url, Void.class);
    }

    public RawDivisionMappingDTO createRawDivisionMapping(RawDivisionMappingDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions")
                .build()
                .toUriString();

        return apiClientService.post(url, dto, RawDivisionMappingDTO.class).getBody();
    }

    public List<RawDivisionMappingDTO> listRawDivisionMappings(String leagueCode, String season) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions")
                .queryParamIfPresent("league_code", java.util.Optional.ofNullable(leagueCode))
                .queryParamIfPresent("season", java.util.Optional.ofNullable(season))
                .build()
                .toUriString();

        ResponseEntity<RawDivisionMappingDTO[]> res = apiClientService.get(url, RawDivisionMappingDTO[].class);
        return res.getBody() != null ? java.util.Arrays.asList(res.getBody()) : java.util.Collections.emptyList();
    }

    public RawDivisionMappingDTO getRawDivisionMappingById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions", id.toString())
                .build()
                .toUriString();

        return apiClientService.get(url, RawDivisionMappingDTO.class).getBody();
    }

    public RawDivisionMappingDTO updateRawDivisionMapping(Long id, RawDivisionMappingUpdateDTO dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions", id.toString())
                .build()
                .toUriString();

        return apiClientService.put(url, dto, RawDivisionMappingDTO.class).getBody();
    }

    public ScraperStatusDTO updateScraperStatus(String name, boolean enabled) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("scrapers", name, "enabled")
                .queryParam("enabled", enabled)
                .build()
                .toUriString();

        ResponseEntity<ScraperStatusDTO> response = apiClientService.put(url, null, ScraperStatusDTO.class);
        return response.getBody();
    }

    public List<ScraperStatusDTO> listScraperStatuses() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("scrapers", "status")
                .build()
                .toUriString();

        ResponseEntity<ScraperStatusDTO[]> response = apiClientService.get(url, ScraperStatusDTO[].class);
        ScraperStatusDTO[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}
