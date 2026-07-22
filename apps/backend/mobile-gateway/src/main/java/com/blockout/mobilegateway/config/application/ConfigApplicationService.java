package com.blockout.mobilegateway.config.application;

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

    public AppStatusView getAppStatus() {
        logger.info("Fetching app status", keyValue("action", "get_app_status"));
        AppStatusView dto = configInternalClient.getAppStatus();
        return dto;
    }

    public AppStatusView updateAppStatus(UpdateAppStatusCommand command) {
        logger.info("Updating app status",
            keyValue("action", "update_app_status"),
            keyValue("maintenance", command.maintenance()));
        AppStatusView updated = configInternalClient.updateAppStatus(command);
        return updated;
    }

    public List<DivisionView> listDivisions() {
        logger.info("Listing all divisions", keyValue("action", "list_all_divisions"));
        List<DivisionView> list = configInternalClient.listDivisions();
        return list;
    }

    public DivisionView getDivisionById(Long id) {
        logger.info("Fetching division", keyValue("action", "get_division_by_id"), keyValue("division_id", id));
        return configInternalClient.getDivisionById(id);
    }

    public DivisionView createDivision(UpsertDivisionCommand command, MultipartFile image) {
        logger.info("Creating division",
            keyValue("action", "create_division"),
            keyValue("has_image", image != null),
            keyValue("name", command.name()));
        return configInternalClient.createDivision(command, image);
    }

    public DivisionView updateDivision(Long id, UpsertDivisionCommand command, MultipartFile image) {
        logger.info("Updating division",
            keyValue("action", "update_division"),
            keyValue("division_id", id),
            keyValue("has_image", image != null),
            keyValue("name", command.name()));
        return configInternalClient.updateDivision(id, command, image);
    }

    public void deactivateDivision(Long id) {
        logger.info("Deactivating division", keyValue("action", "deactivate_division"), keyValue("division_id", id));
        configInternalClient.deactivateDivision(id);
    }

    public LegalDocumentView getLegalDocument(String type) {
        logger.info("Fetching legal document", keyValue("action", "get_legal_document"), keyValue("type", type));
        return configInternalClient.getLegalDocument(type);
    }

    public LegalDocumentView updateLegalDocument(String type, UpdateLegalDocumentCommand command) {
        logger.info("Updating legal document",
            keyValue("action", "update_legal_document"),
            keyValue("type", type));
        return configInternalClient.updateLegalDocument(type, command);
    }

    public RawDivisionMappingView createRawDivisionMapping(CreateRawDivisionMappingCommand command) {
        logger.info("Creating raw division mapping", keyValue("action", "create_raw_division_mapping"));
        return configInternalClient.createRawDivisionMapping(command);
    }

    public List<RawDivisionMappingView> listRawDivisionMappings(String leagueCode, String season) {
        logger.info("Listing raw division mappings",
            keyValue("action", "list_raw_division_mappings"),
            keyValue("league_code", leagueCode),
            keyValue("season", season));
        return configInternalClient.listRawDivisionMappings(leagueCode, season);
    }

    public RawDivisionMappingView getRawDivisionMappingById(Long id) {
        logger.info("Fetching raw division mapping",
            keyValue("action", "get_raw_division_mapping_by_id"),
            keyValue("mapping_id", id));
        return configInternalClient.getRawDivisionMappingById(id);
    }

    public RawDivisionMappingView updateRawDivisionMapping(Long id, UpdateRawDivisionMappingCommand command) {
        logger.info("Updating raw division mapping",
            keyValue("action", "update_raw_division_mapping"),
            keyValue("mapping_id", id));
        return configInternalClient.updateRawDivisionMapping(id, command);
    }

    public ScraperStatusView updateScraperStatus(String name, boolean enabled) {
        logger.info("Updating scraper status",
            keyValue("action", "update_scraper_status"),
            keyValue("scraper_name", name),
            keyValue("enabled", enabled));
        return configInternalClient.updateScraperStatus(name, enabled);
    }

    public List<ScraperStatusView> listScraperStatuses() {
        logger.info("Listing scraper statuses", keyValue("action", "list_scraper_statuses"));
        return configInternalClient.listScraperStatuses();
    }
}
