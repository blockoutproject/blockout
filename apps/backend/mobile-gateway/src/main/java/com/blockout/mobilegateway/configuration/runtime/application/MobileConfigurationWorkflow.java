package com.blockout.mobilegateway.configuration.runtime.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.ScraperNameEnum;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileConfigurationWorkflow {

    private final MobileConfigurationGateway gateway;

    public AppStatusView getAppStatus() {
        return gateway.getAppStatus();
    }

    public AppStatusView updateAppStatus(UpdateAppStatusCommand command) {
        return gateway.updateAppStatus(command);
    }

    public List<DivisionView> listDivisions() {
        return gateway.listDivisions();
    }

    public DivisionView getDivision(Long id) {
        return gateway.getDivision(id);
    }

    public DivisionView createDivision(DivisionCommand command, BinaryPart image) {
        return gateway.createDivision(command, image);
    }

    public DivisionView updateDivision(Long id, DivisionCommand command, BinaryPart image) {
        return gateway.updateDivision(id, command, image);
    }

    public void deactivateDivision(Long id) {
        gateway.deactivateDivision(id);
    }

    public RawMappingView createRawMapping(CreateRawMappingCommand command) {
        return gateway.createRawMapping(command);
    }

    public List<RawMappingView> listRawMappings(String leagueCode, String season) {
        return gateway.listRawMappings(leagueCode, season);
    }

    public RawMappingView getRawMapping(Long id) {
        return gateway.getRawMapping(id);
    }

    public RawMappingView updateRawMapping(Long id, UpdateRawMappingCommand command) {
        return gateway.updateRawMapping(id, command);
    }

    public ScraperStatusView updateScraper(ScraperNameEnum name, boolean enabled) {
        return gateway.updateScraper(name, enabled);
    }

    public List<ScraperStatusView> listScrapers() {
        return gateway.listScrapers();
    }

    public record UpdateAppStatusCommand(Boolean maintenance, String message, String imageUrl, String minVersionIos,
            String minVersionAndroid, String storeUrlIos, String storeUrlAndroid, String forceUpdateMessage) {
    }

    public record AppStatusView(Boolean maintenance, String message, String imageUrl, String minVersionIos,
            String minVersionAndroid, String storeUrlIos, String storeUrlAndroid, String forceUpdateMessage,
            Instant lastUpdate) {
    }

    public record DivisionCommand(String name, String mainColor, String firstGradientColor,
            String secondGradientColor, String thirdGradientColor) {
    }

    public record DivisionView(Long id, String name, String mainColor, String firstGradientColor,
            String secondGradientColor, String thirdGradientColor, String logoUrl, Boolean active) {
    }

    public record CreateRawMappingCommand(String rawDivisionName, Long divisionId, FormatEnum format,
            GenderEnum gender, String leagueCode, String season) {
    }

    public record UpdateRawMappingCommand(Long divisionId, FormatEnum format, GenderEnum gender) {
    }

    public record RawMappingView(Long id, String rawDivisionName, Long divisionId, FormatEnum format,
            GenderEnum gender, String leagueCode, String season) {
    }

    public record ScraperStatusView(ScraperNameEnum name, Boolean enabled) {
    }
}
