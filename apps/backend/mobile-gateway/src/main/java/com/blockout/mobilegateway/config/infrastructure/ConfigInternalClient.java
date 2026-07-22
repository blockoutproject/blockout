package com.blockout.mobilegateway.config.infrastructure;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.config.application.commands.CreateRawDivisionMappingCommand;
import com.blockout.mobilegateway.config.application.commands.UpdateAppStatusCommand;
import com.blockout.mobilegateway.config.application.commands.UpdateLegalDocumentCommand;
import com.blockout.mobilegateway.config.application.commands.UpdateRawDivisionMappingCommand;
import com.blockout.mobilegateway.config.application.commands.UpsertDivisionCommand;
import com.blockout.mobilegateway.config.application.views.AppStatusView;
import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.config.application.views.LegalDocumentView;
import com.blockout.mobilegateway.config.application.views.RawDivisionMappingView;
import com.blockout.mobilegateway.config.application.views.ScraperStatusView;
import com.blockout.mobilegateway.config.infrastructure.contract.models.AppStatusInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.DivisionInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.LegalDocumentInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.RawDivisionMappingInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.ScraperStatusInternalResponse;
import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.shared.infrastructure.http.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
    private final ConfigContractMapper contractMapper;

    private String baseUrl() {
        return apiClientProperties.getConfig().getUrl();
    }

    public AppStatusView getAppStatus() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("app-status")
            .build()
            .toUriString();

        AppStatusInternalResponse body = internalApiClient.get(url, AppStatusInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public AppStatusView updateAppStatus(UpdateAppStatusCommand command) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("app-status")
            .build()
            .toUriString();

        AppStatusInternalResponse body = internalApiClient.put(
            url, contractMapper.toInternalRequest(command), AppStatusInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    @Cacheable(value = "divisions")
    public List<DivisionView> listDivisions() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("divisions")
            .build()
            .toUriString();

        DivisionInternalResponse[] body = internalApiClient.get(url, DivisionInternalResponse[].class).getBody();
        return body == null ? Collections.emptyList() : Arrays.stream(body).map(contractMapper::toResponse).toList();
    }

    @Cacheable(value = "divisionById", key = "#id")
    public DivisionView getDivisionById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("divisions", id.toString())
            .build()
            .toUriString();

        DivisionInternalResponse body = internalApiClient.get(url, DivisionInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public DivisionView createDivision(UpsertDivisionCommand command, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("divisions")
            .build()
            .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(
            objectMapper, contractMapper.toCreateRequest(command), image);

        DivisionInternalResponse response = internalApiClient.postMultipart(
            url, body, DivisionInternalResponse.class).getBody();
        return response == null ? null : contractMapper.toResponse(response);
    }

    @Caching(put = {
        @CachePut(value = "divisionById", key = "#id")
    }, evict = {
        @CacheEvict(value = "divisions")
    })
    public DivisionView updateDivision(Long id, UpsertDivisionCommand command, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("divisions", id.toString())
            .build()
            .toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(
            objectMapper, contractMapper.toUpdateRequest(command), image);

        DivisionInternalResponse response = internalApiClient.putMultipart(
            url, body, DivisionInternalResponse.class).getBody();
        return response == null ? null : contractMapper.toResponse(response);
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

    public LegalDocumentView getLegalDocument(String type) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("legal", type)
            .build()
            .toUriString();

        LegalDocumentInternalResponse body = internalApiClient.get(url, LegalDocumentInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public LegalDocumentView updateLegalDocument(String type, UpdateLegalDocumentCommand command) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("legal", type)
            .build()
            .toUriString();

        LegalDocumentInternalResponse body = internalApiClient.put(
            url, contractMapper.toInternalRequest(command), LegalDocumentInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public RawDivisionMappingView createRawDivisionMapping(CreateRawDivisionMappingCommand command) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("raw-divisions")
            .build()
            .toUriString();

        RawDivisionMappingInternalResponse body = internalApiClient.post(
            url, contractMapper.toCreateRequest(command), RawDivisionMappingInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public List<RawDivisionMappingView> listRawDivisionMappings(String leagueCode, String season) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("raw-divisions")
            .queryParamIfPresent("leagueCode", java.util.Optional.ofNullable(leagueCode))
            .queryParamIfPresent("season", java.util.Optional.ofNullable(season))
            .build()
            .toUriString();

        RawDivisionMappingInternalResponse[] body = internalApiClient.get(
            url, RawDivisionMappingInternalResponse[].class).getBody();
        return body == null ? Collections.emptyList() : Arrays.stream(body).map(contractMapper::toResponse).toList();
    }

    public RawDivisionMappingView getRawDivisionMappingById(Long id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("raw-divisions", id.toString())
            .build()
            .toUriString();

        RawDivisionMappingInternalResponse body = internalApiClient.get(
            url, RawDivisionMappingInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public RawDivisionMappingView updateRawDivisionMapping(Long id, UpdateRawDivisionMappingCommand command) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("raw-divisions", id.toString())
            .build()
            .toUriString();

        RawDivisionMappingInternalResponse body = internalApiClient.put(
            url, contractMapper.toInternalRequest(command), RawDivisionMappingInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public ScraperStatusView updateScraperStatus(String name, boolean enabled) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("scrapers", name, "enabled")
            .queryParam("enabled", enabled)
            .build()
            .toUriString();

        ScraperStatusInternalResponse body = internalApiClient.put(
            url, null, ScraperStatusInternalResponse.class).getBody();
        return body == null ? null : contractMapper.toResponse(body);
    }

    public List<ScraperStatusView> listScraperStatuses() {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
            .pathSegment("scrapers", "status")
            .build()
            .toUriString();

        ScraperStatusInternalResponse[] body = internalApiClient.get(
            url, ScraperStatusInternalResponse[].class).getBody();
        return body == null ? Collections.emptyList() : Arrays.stream(body).map(contractMapper::toResponse).toList();
    }
}
