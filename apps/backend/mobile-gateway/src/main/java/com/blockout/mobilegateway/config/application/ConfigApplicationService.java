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

/**
 * Orchestrates mobile configuration operations over the internal config-service boundary.
 */
@Service
@RequiredArgsConstructor
public class ConfigApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(ConfigApplicationService.class);
    private final ConfigInternalClient configInternalClient;

    /**
     * Returns the current mobile application status.
     *
     * @return current application status.
     */
    public AppStatusView getAppStatus() {
        logger.debug("Fetching app status", keyValue("action", "get_app_status"));
        return configInternalClient.getAppStatus();
    }

    /**
     * Updates the mobile application status.
     *
     * @param command application status update.
     * @return updated application status.
     */
    public AppStatusView updateAppStatus(UpdateAppStatusCommand command) {
        logger.info("Updating app status",
            keyValue("action", "update_app_status"),
            keyValue("maintenance", command.maintenance()));
        AppStatusView updated = configInternalClient.updateAppStatus(command);
        return updated;
    }

    /**
     * Lists configured divisions.
     *
     * @return configured divisions.
     */
    public List<DivisionView> listDivisions() {
        logger.debug("Listing all divisions", keyValue("action", "list_all_divisions"));
        return configInternalClient.listDivisions();
    }

    /**
     * Returns one division by identifier.
     *
     * @param id division identifier.
     * @return matching division.
     */
    public DivisionView getDivisionById(Long id) {
        logger.debug("Fetching division", keyValue("action", "get_division_by_id"), keyValue("division_id", id));
        return configInternalClient.getDivisionById(id);
    }

    /**
     * Creates a division with an optional image.
     *
     * @param command division values.
     * @param image optional division image.
     * @return created division.
     */
    public DivisionView createDivision(UpsertDivisionCommand command, MultipartFile image) {
        logger.info("Creating division",
            keyValue("action", "create_division"),
            keyValue("has_image", image != null));
        return configInternalClient.createDivision(command, image);
    }

    /**
     * Updates a division with an optional image.
     *
     * @param id division identifier.
     * @param command division values.
     * @param image optional division image.
     * @return updated division.
     */
    public DivisionView updateDivision(Long id, UpsertDivisionCommand command, MultipartFile image) {
        logger.info("Updating division",
            keyValue("action", "update_division"),
            keyValue("division_id", id),
            keyValue("has_image", image != null));
        return configInternalClient.updateDivision(id, command, image);
    }

    /**
     * Deactivates one division.
     *
     * @param id division identifier.
     */
    public void deactivateDivision(Long id) {
        logger.info("Deactivating division", keyValue("action", "deactivate_division"), keyValue("division_id", id));
        configInternalClient.deactivateDivision(id);
    }

    /**
     * Returns one legal document by type.
     *
     * @param type legal-document type.
     * @return matching legal document.
     */
    public LegalDocumentView getLegalDocument(String type) {
        logger.debug("Fetching legal document", keyValue("action", "get_legal_document"), keyValue("type", type));
        return configInternalClient.getLegalDocument(type);
    }

    /**
     * Updates one legal document.
     *
     * @param type legal-document type.
     * @param command document update.
     * @return updated legal document.
     */
    public LegalDocumentView updateLegalDocument(String type, UpdateLegalDocumentCommand command) {
        logger.info("Updating legal document",
            keyValue("action", "update_legal_document"),
            keyValue("type", type));
        return configInternalClient.updateLegalDocument(type, command);
    }

    /**
     * Creates a raw division mapping.
     *
     * @param command mapping values.
     * @return created mapping.
     */
    public RawDivisionMappingView createRawDivisionMapping(CreateRawDivisionMappingCommand command) {
        logger.info("Creating raw division mapping", keyValue("action", "create_raw_division_mapping"));
        return configInternalClient.createRawDivisionMapping(command);
    }

    /**
     * Lists raw division mappings for a league and season.
     *
     * @param leagueCode league code filter.
     * @param season season filter.
     * @return matching mappings.
     */
    public List<RawDivisionMappingView> listRawDivisionMappings(String leagueCode, String season) {
        logger.debug("Listing raw division mappings",
            keyValue("action", "list_raw_division_mappings"),
            keyValue("league_code", leagueCode),
            keyValue("season", season));
        return configInternalClient.listRawDivisionMappings(leagueCode, season);
    }

    /**
     * Returns one raw division mapping.
     *
     * @param id mapping identifier.
     * @return matching mapping.
     */
    public RawDivisionMappingView getRawDivisionMappingById(Long id) {
        logger.debug("Fetching raw division mapping",
            keyValue("action", "get_raw_division_mapping_by_id"),
            keyValue("mapping_id", id));
        return configInternalClient.getRawDivisionMappingById(id);
    }

    /**
     * Updates one raw division mapping.
     *
     * @param id mapping identifier.
     * @param command mapping update.
     * @return updated mapping.
     */
    public RawDivisionMappingView updateRawDivisionMapping(Long id, UpdateRawDivisionMappingCommand command) {
        logger.info("Updating raw division mapping",
            keyValue("action", "update_raw_division_mapping"),
            keyValue("mapping_id", id));
        return configInternalClient.updateRawDivisionMapping(id, command);
    }

    /**
     * Updates one scraper's enabled status.
     *
     * @param name scraper contract name.
     * @param enabled desired enabled state.
     * @return updated scraper status.
     */
    public ScraperStatusView updateScraperStatus(String name, boolean enabled) {
        logger.info("Updating scraper status",
            keyValue("action", "update_scraper_status"),
            keyValue("scraper_name", name),
            keyValue("enabled", enabled));
        return configInternalClient.updateScraperStatus(name, enabled);
    }

    /**
     * Lists configured scraper statuses.
     *
     * @return configured scraper statuses.
     */
    public List<ScraperStatusView> listScraperStatuses() {
        logger.debug("Listing scraper statuses", keyValue("action", "list_scraper_statuses"));
        return configInternalClient.listScraperStatuses();
    }
}
