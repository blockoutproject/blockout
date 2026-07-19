package com.blockout.mobilegateway.config.infrastructure;

import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.config.api.models.AppStatusResponse;
import com.blockout.mobilegateway.config.api.models.UpdateAppStatusRequest;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.api.models.UpsertDivisionRequest;
import com.blockout.mobilegateway.config.api.models.LegalDocumentResponse;
import com.blockout.mobilegateway.config.api.models.UpdateLegalDocumentRequest;
import com.blockout.mobilegateway.config.api.models.RawDivisionMappingResponse;
import com.blockout.mobilegateway.config.api.models.UpdateRawDivisionMappingRequest;
import com.blockout.mobilegateway.config.api.models.ScraperStatusResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class ConfigInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getConfig().getUrl();
    }

    public AppStatusResponse getAppStatus() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("app-status")
                .build()
                .toUriString();

        ResponseEntity<AppStatusResponse> res = internalApiClient.get(url, AppStatusResponse.class);
        return res.getBody();
    }

    public AppStatusResponse updateAppStatus(UpdateAppStatusRequest dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("app-status")
                .build()
                .toUriString();

        ResponseEntity<AppStatusResponse> res = internalApiClient.put(url, dto, AppStatusResponse.class);
        return res.getBody();
    }

    @Cacheable(value = "divisions")
    public List<DivisionResponse> listDivisions() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions")
                .build()
                .toUriString();

        ResponseEntity<DivisionResponse[]> response = internalApiClient.get(url, DivisionResponse[].class);
        DivisionResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }

    @Cacheable(value = "divisionById", key = "#id")
    public DivisionResponse getDivisionById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions", id.toString())
                .build()
                .toUriString();

        ResponseEntity<DivisionResponse> response = internalApiClient.get(url, DivisionResponse.class);
        return response.getBody();
    }

    public DivisionResponse createDivision(UpsertDivisionRequest dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions")
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<DivisionResponse> response = internalApiClient.postMultipart(url, body, DivisionResponse.class);
        return response.getBody();
    }

    @Caching(put = {
            @CachePut(value = "divisionById", key = "#id")
    }, evict = {
            @CacheEvict(value = "divisions")
    })
    public DivisionResponse updateDivision(Long id, UpsertDivisionRequest dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("divisions", id.toString())
                .build()
                .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<DivisionResponse> response = internalApiClient.putMultipart(url, body, DivisionResponse.class);
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

        internalApiClient.delete(url, Void.class);
    }

    public LegalDocumentResponse getLegalDocument(String type) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("legal", type)
                .build()
                .toUriString();

        ResponseEntity<LegalDocumentResponse> res = internalApiClient.get(url, LegalDocumentResponse.class);
        return res.getBody();
    }

    public LegalDocumentResponse updateLegalDocument(String type, UpdateLegalDocumentRequest dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("legal", type)
                .build()
                .toUriString();

        ResponseEntity<LegalDocumentResponse> res = internalApiClient.put(url, dto, LegalDocumentResponse.class);
        return res.getBody();
    }

    public RawDivisionMappingResponse createRawDivisionMapping(RawDivisionMappingResponse dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions")
                .build()
                .toUriString();

        return internalApiClient.post(url, dto, RawDivisionMappingResponse.class).getBody();
    }

    public List<RawDivisionMappingResponse> listRawDivisionMappings(String leagueCode, String season) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions")
                .queryParamIfPresent("leagueCode", java.util.Optional.ofNullable(leagueCode))
                .queryParamIfPresent("season", java.util.Optional.ofNullable(season))
                .build()
                .toUriString();

        ResponseEntity<RawDivisionMappingResponse[]> res = internalApiClient.get(url, RawDivisionMappingResponse[].class);
        return res.getBody() != null ? java.util.Arrays.asList(res.getBody()) : java.util.Collections.emptyList();
    }

    public RawDivisionMappingResponse getRawDivisionMappingById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions", id.toString())
                .build()
                .toUriString();

        return internalApiClient.get(url, RawDivisionMappingResponse.class).getBody();
    }

    public RawDivisionMappingResponse updateRawDivisionMapping(Long id, UpdateRawDivisionMappingRequest dto) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("raw-divisions", id.toString())
                .build()
                .toUriString();

        return internalApiClient.put(url, dto, RawDivisionMappingResponse.class).getBody();
    }

    public ScraperStatusResponse updateScraperStatus(String name, boolean enabled) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("scrapers", name, "enabled")
                .queryParam("enabled", enabled)
                .build()
                .toUriString();

        ResponseEntity<ScraperStatusResponse> response = internalApiClient.put(url, null, ScraperStatusResponse.class);
        return response.getBody();
    }

    public List<ScraperStatusResponse> listScraperStatuses() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment("scrapers", "status")
                .build()
                .toUriString();

        ResponseEntity<ScraperStatusResponse[]> response = internalApiClient.get(url, ScraperStatusResponse[].class);
        ScraperStatusResponse[] body = response.getBody();
        return body != null ? Arrays.asList(body) : Collections.emptyList();
    }
}
