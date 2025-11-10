package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.config.*;
import com.blockout.mobilegateway.services.clients.ConfigClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class ConfigService {

    private static final Logger logger = Logger.getLogger(ConfigService.class.getName());
    private final ConfigClientService configClientService;

    public List<DivisionDTO> listDivisions() {
        logger.info("Listing all divisions");
        return configClientService.listDivisions();
    }

    public DivisionDTO getDivisionById(Long id) {
        logger.info("Fetching division id=" + id);
        return configClientService.getDivisionById(id);
    }

    public DivisionDTO createDivision(DivisionUpdateDTO dto, MultipartFile image) {
        logger.info("Creating division");
        return configClientService.createDivision(dto, image);
    }

    public DivisionDTO updateDivision(Long id, DivisionUpdateDTO dto, MultipartFile image) {
        logger.info("Updating division id=" + id);
        System.out.println("Updating division with data: " + dto.toString());
        return configClientService.updateDivision(id, dto, image);
    }

    public void deactivateDivision(Long id) {
        logger.info("Deactivating division id=" + id);
        configClientService.deactivateDivision(id);
    }

    public LegalDocumentDTO getLegalDocument(String type) {
        logger.info("Fetching legal document type=" + type);
        return configClientService.getLegalDocument(type);
    }

    public LegalDocumentDTO updateLegalDocument(String type, LegalDocumentUpdateDTO dto) {
        logger.info("Updating legal document type=" + type);
        return configClientService.updateLegalDocument(type, dto);
    }

    public RawDivisionMappingDTO createRawDivisionMapping(RawDivisionMappingDTO dto) {
        logger.info("Creating raw division mapping");
        return configClientService.createRawDivisionMapping(dto);
    }

    public List<RawDivisionMappingDTO> listRawDivisionMappings(String leagueCode, String season) {
        logger.info("Listing raw division mappings");
        return configClientService.listRawDivisionMappings(leagueCode, season);
    }

    public RawDivisionMappingDTO getRawDivisionMappingById(Long id) {
        logger.info("Fetching raw division mapping id=" + id);
        return configClientService.getRawDivisionMappingById(id);
    }

    public RawDivisionMappingDTO updateRawDivisionMapping(Long id, RawDivisionMappingUpdateDTO dto) {
        logger.info("Updating raw division mapping id=" + id);
        return configClientService.updateRawDivisionMapping(id, dto);
    }

    public ScraperStatusDTO updateScraperStatus(String name, boolean enabled) {
        logger.info("Updating scraper status name=" + name + " enabled=" + enabled);
        return configClientService.updateScraperStatus(name, enabled);
    }

    public List<ScraperStatusDTO> listScraperStatuses() {
        logger.info("Listing scraper statuses");
        return configClientService.listScraperStatuses();
    }
}