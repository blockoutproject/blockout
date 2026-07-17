package com.blockout.mobilegateway.configuration.runtime.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.shared.model.ScraperNameEnum;
import java.util.List;

public interface MobileConfigurationGateway {

    MobileConfigurationWorkflow.AppStatusView getAppStatus();

    MobileConfigurationWorkflow.AppStatusView updateAppStatus(MobileConfigurationWorkflow.UpdateAppStatusCommand command);

    List<MobileConfigurationWorkflow.DivisionView> listDivisions();

    MobileConfigurationWorkflow.DivisionView getDivision(Long id);

    MobileConfigurationWorkflow.DivisionView findDivision(Long id);

    MobileConfigurationWorkflow.DivisionView createDivision(
            MobileConfigurationWorkflow.DivisionCommand command, BinaryPart image);

    MobileConfigurationWorkflow.DivisionView updateDivision(
            Long id, MobileConfigurationWorkflow.DivisionCommand command, BinaryPart image);

    void deactivateDivision(Long id);

    MobileConfigurationWorkflow.RawMappingView createRawMapping(
            MobileConfigurationWorkflow.CreateRawMappingCommand command);

    List<MobileConfigurationWorkflow.RawMappingView> listRawMappings(String leagueCode, String season);

    MobileConfigurationWorkflow.RawMappingView getRawMapping(Long id);

    MobileConfigurationWorkflow.RawMappingView updateRawMapping(
            Long id, MobileConfigurationWorkflow.UpdateRawMappingCommand command);

    MobileConfigurationWorkflow.ScraperStatusView updateScraper(ScraperNameEnum name, boolean enabled);

    List<MobileConfigurationWorkflow.ScraperStatusView> listScrapers();
}
