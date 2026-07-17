package com.blockout.mobilegateway.configuration.runtime.api;

import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.generated.api.MobileConfigurationApi;
import com.blockout.mobilegateway.generated.model.CreateMobileDivisionRequest;
import com.blockout.mobilegateway.generated.model.CreateMobileRawDivisionMappingRequest;
import com.blockout.mobilegateway.generated.model.MobileAppStatus;
import com.blockout.mobilegateway.generated.model.MobileDivision;
import com.blockout.mobilegateway.generated.model.MobileDivisionListResponse;
import com.blockout.mobilegateway.generated.model.MobileRawDivisionMapping;
import com.blockout.mobilegateway.generated.model.MobileRawDivisionMappingListResponse;
import com.blockout.mobilegateway.generated.model.MobileScraperStatus;
import com.blockout.mobilegateway.generated.model.MobileScraperStatusListResponse;
import com.blockout.mobilegateway.generated.model.UpdateMobileAppStatusRequest;
import com.blockout.mobilegateway.generated.model.UpdateMobileDivisionRequest;
import com.blockout.mobilegateway.generated.model.UpdateMobileRawDivisionMappingRequest;
import com.blockout.mobilegateway.shared.api.BinaryParts;
import com.blockout.shared.model.ScraperNameEnum;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class MobileConfigurationV2Controller implements MobileConfigurationApi {

    private final MobileConfigurationWorkflow workflow;

    @Override
    public ResponseEntity<MobileAppStatus> getMobileAppStatus() {
        return ResponseEntity.ok(appStatus(workflow.getAppStatus()));
    }

    @Override
    public ResponseEntity<MobileAppStatus> updateMobileAppStatus(UpdateMobileAppStatusRequest request) {
        var command = new MobileConfigurationWorkflow.UpdateAppStatusCommand(
                request.getMaintenance(), request.getMessage(), request.getImageUrl(), request.getMinVersionIos(),
                request.getMinVersionAndroid(), request.getStoreUrlIos(), request.getStoreUrlAndroid(),
                request.getForceUpdateMessage());
        return ResponseEntity.ok(appStatus(workflow.updateAppStatus(command)));
    }

    @Override
    public ResponseEntity<MobileDivisionListResponse> listMobileDivisions() {
        return ResponseEntity.ok(new MobileDivisionListResponse(workflow.listDivisions().stream()
                .map(this::division).toList()));
    }

    @Override
    public ResponseEntity<MobileDivision> getMobileDivision(Long id) {
        return ResponseEntity.ok(division(workflow.getDivision(id)));
    }

    @Override
    public ResponseEntity<MobileDivision> createMobileDivision(
            CreateMobileDivisionRequest data, MultipartFile image) {
        var created = division(workflow.createDivision(divisionCommand(data), BinaryParts.from(image)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(created.getId()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Override
    public ResponseEntity<MobileDivision> updateMobileDivision(
            Long id, UpdateMobileDivisionRequest data, MultipartFile image) {
        var command = new MobileConfigurationWorkflow.DivisionCommand(
                data.getName(), data.getMainColor(), data.getFirstGradientColor(), data.getSecondGradientColor(),
                data.getThirdGradientColor());
        return ResponseEntity.ok(division(workflow.updateDivision(id, command, BinaryParts.from(image))));
    }

    @Override
    public ResponseEntity<Void> deactivateMobileDivision(Long id) {
        workflow.deactivateDivision(id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<MobileRawDivisionMapping> createMobileRawDivisionMapping(
            CreateMobileRawDivisionMappingRequest request) {
        var command = new MobileConfigurationWorkflow.CreateRawMappingCommand(
                request.getRawDivisionName(), request.getDivisionId(), request.getFormat(), request.getGender(),
                request.getLeagueCode(), request.getSeason());
        var created = rawMapping(workflow.createRawMapping(command));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(created.getId()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Override
    public ResponseEntity<MobileRawDivisionMappingListResponse> listMobileRawDivisionMappings(
            String leagueCode, String season) {
        return ResponseEntity.ok(new MobileRawDivisionMappingListResponse(
                workflow.listRawMappings(leagueCode, season).stream().map(this::rawMapping).toList()));
    }

    @Override
    public ResponseEntity<MobileRawDivisionMapping> getMobileRawDivisionMapping(Long id) {
        return ResponseEntity.ok(rawMapping(workflow.getRawMapping(id)));
    }

    @Override
    public ResponseEntity<MobileRawDivisionMapping> updateMobileRawDivisionMapping(
            Long id, UpdateMobileRawDivisionMappingRequest request) {
        var command = new MobileConfigurationWorkflow.UpdateRawMappingCommand(
                request.getDivisionId(), request.getFormat(), request.getGender());
        return ResponseEntity.ok(rawMapping(workflow.updateRawMapping(id, command)));
    }

    @Override
    public ResponseEntity<MobileScraperStatus> updateMobileScraperEnabled(
            ScraperNameEnum name, Boolean enabled) {
        return ResponseEntity.ok(scraper(workflow.updateScraper(name, enabled)));
    }

    @Override
    public ResponseEntity<MobileScraperStatusListResponse> listMobileScraperStatuses() {
        return ResponseEntity.ok(new MobileScraperStatusListResponse(
                workflow.listScrapers().stream().map(this::scraper).toList()));
    }

    private MobileConfigurationWorkflow.DivisionCommand divisionCommand(CreateMobileDivisionRequest data) {
        return new MobileConfigurationWorkflow.DivisionCommand(
                data.getName(), data.getMainColor(), data.getFirstGradientColor(), data.getSecondGradientColor(),
                data.getThirdGradientColor());
    }

    private MobileAppStatus appStatus(MobileConfigurationWorkflow.AppStatusView value) {
        return new MobileAppStatus(value.maintenance(), value.message(), value.imageUrl(), value.minVersionIos(),
                value.minVersionAndroid(), value.storeUrlIos(), value.storeUrlAndroid(), value.forceUpdateMessage(),
                value.lastUpdate());
    }

    private MobileDivision division(MobileConfigurationWorkflow.DivisionView value) {
        return new MobileDivision(value.id(), value.name(), value.mainColor(), value.firstGradientColor(),
                value.secondGradientColor(), value.thirdGradientColor(), value.logoUrl(), value.active());
    }

    private MobileRawDivisionMapping rawMapping(MobileConfigurationWorkflow.RawMappingView value) {
        return new MobileRawDivisionMapping(value.id(), value.rawDivisionName(), value.divisionId(), value.format(),
                value.gender(), value.leagueCode(), value.season());
    }

    private MobileScraperStatus scraper(MobileConfigurationWorkflow.ScraperStatusView value) {
        return new MobileScraperStatus(value.name(), value.enabled());
    }
}
