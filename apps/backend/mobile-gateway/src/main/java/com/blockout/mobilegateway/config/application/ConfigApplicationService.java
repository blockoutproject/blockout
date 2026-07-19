package com.blockout.mobilegateway.config.application;

import com.blockout.mobilegateway.config.api.models.*;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ConfigApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(ConfigApplicationService.class);
    private final ConfigInternalClient configInternalClient;

    public AppStatusResponse getAppStatus() {
        logger.info("Fetching app status", keyValue("action", "get_app_status"));
        AppStatusResponse dto = configInternalClient.getAppStatus();
        return dto;
    }

    public AppStatusResponse updateAppStatus(UpdateAppStatusRequest dto) {
        logger.info("Updating app status",
                keyValue("action", "update_app_status"),
                keyValue("maintenance", dto.getMaintenance()));
        AppStatusResponse updated = configInternalClient.updateAppStatus(dto);
        return updated;
    }

    public List<DivisionResponse> listDivisions() {
        logger.info("Listing all divisions", keyValue("action", "list_all_divisions"));
        List<DivisionResponse> list = configInternalClient.listDivisions();
        return list;
    }

    public DivisionResponse getDivisionById(Long id) {
        logger.info("Fetching division", keyValue("action", "get_division_by_id"), keyValue("division_id", id));
        return configInternalClient.getDivisionById(id);
    }

    public DivisionResponse createDivision(UpsertDivisionRequest dto, MultipartFile image) {
        logger.info("Creating division",
                keyValue("action", "create_division"),
                keyValue("has_image", image != null),
                keyValue("name", dto.getName()));
        return configInternalClient.createDivision(dto, image);
    }

    public DivisionResponse updateDivision(Long id, UpsertDivisionRequest dto, MultipartFile image) {
        logger.info("Updating division",
                keyValue("action", "update_division"),
                keyValue("division_id", id),
                keyValue("has_image", image != null),
                keyValue("name", dto.getName()));
        return configInternalClient.updateDivision(id, dto, image);
    }

    public void deactivateDivision(Long id) {
        logger.info("Deactivating division", keyValue("action", "deactivate_division"), keyValue("division_id", id));
        configInternalClient.deactivateDivision(id);
    }

    public LegalDocumentResponse getLegalDocument(String type) {
        logger.info("Fetching legal document", keyValue("action", "get_legal_document"), keyValue("type", type));
        return configInternalClient.getLegalDocument(type);
    }

    public LegalDocumentResponse updateLegalDocument(String type, UpdateLegalDocumentRequest dto) {
        logger.info("Updating legal document",
                keyValue("action", "update_legal_document"),
                keyValue("type", type));
        return configInternalClient.updateLegalDocument(type, dto);
    }

    public RawDivisionMappingResponse createRawDivisionMapping(RawDivisionMappingResponse dto) {
        logger.info("Creating raw division mapping", keyValue("action", "create_raw_division_mapping"));
        return configInternalClient.createRawDivisionMapping(dto);
    }

    public List<RawDivisionMappingResponse> listRawDivisionMappings(String leagueCode, String season) {
        logger.info("Listing raw division mappings",
                keyValue("action", "list_raw_division_mappings"),
                keyValue("league_code", leagueCode),
                keyValue("season", season));
        return configInternalClient.listRawDivisionMappings(leagueCode, season);
    }

    public RawDivisionMappingResponse getRawDivisionMappingById(Long id) {
        logger.info("Fetching raw division mapping",
                keyValue("action", "get_raw_division_mapping_by_id"),
                keyValue("mapping_id", id));
        return configInternalClient.getRawDivisionMappingById(id);
    }

    public RawDivisionMappingResponse updateRawDivisionMapping(Long id, UpdateRawDivisionMappingRequest dto) {
        logger.info("Updating raw division mapping",
                keyValue("action", "update_raw_division_mapping"),
                keyValue("mapping_id", id));
        return configInternalClient.updateRawDivisionMapping(id, dto);
    }

    public ScraperStatusResponse updateScraperStatus(String name, boolean enabled) {
        logger.info("Updating scraper status",
                keyValue("action", "update_scraper_status"),
                keyValue("scraper_name", name),
                keyValue("enabled", enabled));
        return configInternalClient.updateScraperStatus(name, enabled);
    }

    public List<ScraperStatusResponse> listScraperStatuses() {
        logger.info("Listing scraper statuses", keyValue("action", "list_scraper_statuses"));
        return configInternalClient.listScraperStatuses();
    }
}