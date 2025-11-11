package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.*;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ConfigService {

    private static final Logger logger = LoggerFactory.getLogger(ConfigService.class);
    private final ConfigClientService configClientService;

    public List<DivisionDTO> listDivisions() {
        logger.info("Listing all divisions", keyValue("action", "list_all_divisions"));
        List<DivisionDTO> list = configClientService.listDivisions();
        logger.info("Divisions listed successfully",
                keyValue("action", "list_all_divisions"),
                keyValue("count", list.size()));
        return list;
    }

    public DivisionDTO getDivisionById(Long id) {
        logger.info("Fetching division", keyValue("action", "get_division_by_id"), keyValue("division_id", id));
        return configClientService.getDivisionById(id);
    }

    public DivisionDTO createDivision(DivisionUpdateDTO dto, MultipartFile image) {
        logger.info("Creating division",
                keyValue("action", "create_division"),
                keyValue("has_image", image != null),
                keyValue("name", dto.getName()));
        return configClientService.createDivision(dto, image);
    }

    public DivisionDTO updateDivision(Long id, DivisionUpdateDTO dto, MultipartFile image) {
        logger.info("Updating division",
                keyValue("action", "update_division"),
                keyValue("division_id", id),
                keyValue("has_image", image != null),
                keyValue("name", dto.getName()));
        return configClientService.updateDivision(id, dto, image);
    }

    public void deactivateDivision(Long id) {
        logger.info("Deactivating division", keyValue("action", "deactivate_division"), keyValue("division_id", id));
        configClientService.deactivateDivision(id);
    }

    public LegalDocumentDTO getLegalDocument(String type) {
        logger.info("Fetching legal document", keyValue("action", "get_legal_document"), keyValue("type", type));
        return configClientService.getLegalDocument(type);
    }

    public LegalDocumentDTO updateLegalDocument(String type, LegalDocumentUpdateDTO dto) {
        logger.info("Updating legal document",
                keyValue("action", "update_legal_document"),
                keyValue("type", type));
        return configClientService.updateLegalDocument(type, dto);
    }

    public RawDivisionMappingDTO createRawDivisionMapping(RawDivisionMappingDTO dto) {
        logger.info("Creating raw division mapping", keyValue("action", "create_raw_division_mapping"));
        return configClientService.createRawDivisionMapping(dto);
    }

    public List<RawDivisionMappingDTO> listRawDivisionMappings(String leagueCode, String season) {
        logger.info("Listing raw division mappings",
                keyValue("action", "list_raw_division_mappings"),
                keyValue("league_code", leagueCode),
                keyValue("season", season));
        return configClientService.listRawDivisionMappings(leagueCode, season);
    }

    public RawDivisionMappingDTO getRawDivisionMappingById(Long id) {
        logger.info("Fetching raw division mapping",
                keyValue("action", "get_raw_division_mapping_by_id"),
                keyValue("mapping_id", id));
        return configClientService.getRawDivisionMappingById(id);
    }

    public RawDivisionMappingDTO updateRawDivisionMapping(Long id, RawDivisionMappingUpdateDTO dto) {
        logger.info("Updating raw division mapping",
                keyValue("action", "update_raw_division_mapping"),
                keyValue("mapping_id", id));
        return configClientService.updateRawDivisionMapping(id, dto);
    }

    public ScraperStatusDTO updateScraperStatus(String name, boolean enabled) {
        logger.info("Updating scraper status",
                keyValue("action", "update_scraper_status"),
                keyValue("scraper_name", name),
                keyValue("enabled", enabled));
        return configClientService.updateScraperStatus(name, enabled);
    }

    public List<ScraperStatusDTO> listScraperStatuses() {
        logger.info("Listing scraper statuses", keyValue("action", "list_scraper_statuses"));
        List<ScraperStatusDTO> list = configClientService.listScraperStatuses();
        logger.info("Scraper statuses listed",
                keyValue("action", "list_scraper_statuses"),
                keyValue("count", list.size()));
        return list;
    }
}