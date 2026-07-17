package com.blockout.mobilegateway.configuration.runtime.outbound;

import com.blockout.config.client.api.AppStatusClient;
import com.blockout.config.client.api.DivisionsClient;
import com.blockout.config.client.api.RawDivisionMappingsClient;
import com.blockout.config.client.api.ScraperStatusesClient;
import com.blockout.config.client.model.CreateDivisionInternalRequest;
import com.blockout.config.client.model.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.client.model.UpdateAppStatusInternalRequest;
import com.blockout.config.client.model.UpdateDivisionInternalRequest;
import com.blockout.config.client.model.UpdateRawDivisionMappingInternalRequest;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationGateway;
import com.blockout.mobilegateway.configuration.runtime.application.MobileConfigurationWorkflow;
import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import com.blockout.mobilegateway.shared.outbound.TemporaryFilePart;
import com.blockout.shared.model.ScraperNameEnum;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileConfigurationGateway implements MobileConfigurationGateway {

    private final AppStatusClient appStatusUser;
    private final AppStatusClient appStatusM2m;
    private final DivisionsClient divisionsUser;
    private final DivisionsClient divisionsM2m;
    private final RawDivisionMappingsClient rawMappings;
    private final ScraperStatusesClient scrapers;

    public GeneratedMobileConfigurationGateway(
            @Qualifier("configAppStatusUserClient") AppStatusClient appStatusUser,
            @Qualifier("configAppStatusM2mClient") AppStatusClient appStatusM2m,
            @Qualifier("configDivisionsUserClient") DivisionsClient divisionsUser,
            @Qualifier("configDivisionsM2mClient") DivisionsClient divisionsM2m,
            @Qualifier("configRawMappingsUserClient") RawDivisionMappingsClient rawMappings,
            @Qualifier("configScraperStatusesUserClient") ScraperStatusesClient scrapers) {
        this.appStatusUser = appStatusUser;
        this.appStatusM2m = appStatusM2m;
        this.divisionsUser = divisionsUser;
        this.divisionsM2m = divisionsM2m;
        this.rawMappings = rawMappings;
        this.scrapers = scrapers;
    }

    @Override
    public MobileConfigurationWorkflow.AppStatusView getAppStatus() {
        return appStatus(DownstreamClientSupport.hasUserJwt()
                ? appStatusUser.getAppStatus()
                : appStatusM2m.getAppStatus());
    }

    @Override
    public MobileConfigurationWorkflow.AppStatusView updateAppStatus(
            MobileConfigurationWorkflow.UpdateAppStatusCommand command) {
        var request = new UpdateAppStatusInternalRequest()
                .maintenance(command.maintenance()).message(command.message()).imageUrl(command.imageUrl())
                .minVersionIos(command.minVersionIos()).minVersionAndroid(command.minVersionAndroid())
                .storeUrlIos(command.storeUrlIos()).storeUrlAndroid(command.storeUrlAndroid())
                .forceUpdateMessage(command.forceUpdateMessage());
        return appStatus(appStatusUser.updateAppStatus(request));
    }

    @Override
    @Cacheable("mobileV2Divisions")
    public List<MobileConfigurationWorkflow.DivisionView> listDivisions() {
        var response = divisionClient().listDivisions();
        return response.getItems().stream().map(this::division).toList();
    }

    @Override
    @Cacheable(value = "mobileV2DivisionById", key = "#id")
    public MobileConfigurationWorkflow.DivisionView getDivision(Long id) {
        return division(divisionClient().getDivision(id));
    }

    @Override
    @Cacheable(value = "mobileV2DivisionById", key = "#id")
    public MobileConfigurationWorkflow.DivisionView findDivision(Long id) {
        var value = DownstreamClientSupport.nullableWhenNotFound(() -> divisionClient().getDivision(id));
        return value == null ? null : division(value);
    }

    @Override
    public MobileConfigurationWorkflow.DivisionView createDivision(
            MobileConfigurationWorkflow.DivisionCommand command, BinaryPart image) {
        return withDivisionFile(image, file -> division(divisionsUser.createDivision(createDivision(command), file)));
    }

    @Override
    @Caching(
            put = @CachePut(value = "mobileV2DivisionById", key = "#id"),
            evict = {
                    @CacheEvict("mobileV2Divisions"),
                    @CacheEvict(value = "divisionById", key = "#id"),
                    @CacheEvict("divisions")
            })
    public MobileConfigurationWorkflow.DivisionView updateDivision(
            Long id, MobileConfigurationWorkflow.DivisionCommand command, BinaryPart image) {
        var request = new UpdateDivisionInternalRequest()
                .name(command.name()).mainColor(command.mainColor()).firstGradientColor(command.firstGradientColor())
                .secondGradientColor(command.secondGradientColor()).thirdGradientColor(command.thirdGradientColor());
        return withDivisionFile(image, file -> division(divisionsUser.updateDivision(id, request, file)));
    }

    @Override
    @Caching(evict = {
            @CacheEvict(value = "mobileV2DivisionById", key = "#id"),
            @CacheEvict("mobileV2Divisions"),
            @CacheEvict(value = "divisionById", key = "#id"),
            @CacheEvict("divisions")
    })
    public void deactivateDivision(Long id) {
        divisionsUser.deactivateDivision(id);
    }

    @Override
    public MobileConfigurationWorkflow.RawMappingView createRawMapping(
            MobileConfigurationWorkflow.CreateRawMappingCommand command) {
        var request = new CreateRawDivisionMappingInternalRequest()
                .rawDivisionName(command.rawDivisionName()).divisionId(command.divisionId()).format(command.format())
                .gender(command.gender()).leagueCode(command.leagueCode()).season(command.season());
        return rawMapping(rawMappings.createRawDivisionMapping(request));
    }

    @Override
    public List<MobileConfigurationWorkflow.RawMappingView> listRawMappings(String leagueCode, String season) {
        return rawMappings.listRawDivisionMappings(leagueCode, season).getItems().stream()
                .map(this::rawMapping).toList();
    }

    @Override
    public MobileConfigurationWorkflow.RawMappingView getRawMapping(Long id) {
        return rawMapping(rawMappings.getRawDivisionMapping(id));
    }

    @Override
    public MobileConfigurationWorkflow.RawMappingView updateRawMapping(
            Long id, MobileConfigurationWorkflow.UpdateRawMappingCommand command) {
        var request = new UpdateRawDivisionMappingInternalRequest()
                .divisionId(command.divisionId()).format(command.format()).gender(command.gender());
        return rawMapping(rawMappings.updateRawDivisionMapping(id, request));
    }

    @Override
    public MobileConfigurationWorkflow.ScraperStatusView updateScraper(ScraperNameEnum name, boolean enabled) {
        return scraper(scrapers.updateScraperEnabled(name, enabled));
    }

    @Override
    public List<MobileConfigurationWorkflow.ScraperStatusView> listScrapers() {
        return scrapers.listScraperStatuses().getItems().stream().map(this::scraper).toList();
    }

    private DivisionsClient divisionClient() {
        return DownstreamClientSupport.hasUserJwt() ? divisionsUser : divisionsM2m;
    }

    private CreateDivisionInternalRequest createDivision(MobileConfigurationWorkflow.DivisionCommand command) {
        return new CreateDivisionInternalRequest()
                .name(command.name()).mainColor(command.mainColor()).firstGradientColor(command.firstGradientColor())
                .secondGradientColor(command.secondGradientColor()).thirdGradientColor(command.thirdGradientColor());
    }

    private <T> T withDivisionFile(BinaryPart image, java.util.function.Function<java.io.File, T> action) {
        TemporaryFilePart temporary = TemporaryFilePart.create(image);
        try {
            return action.apply(temporary == null ? null : temporary.file());
        } finally {
            if (temporary != null) {
                temporary.close();
            }
        }
    }

    private MobileConfigurationWorkflow.AppStatusView appStatus(
            com.blockout.config.client.model.AppStatusInternalResponse value) {
        return new MobileConfigurationWorkflow.AppStatusView(value.getMaintenance(), value.getMessage(), value.getImageUrl(),
                value.getMinVersionIos(), value.getMinVersionAndroid(), value.getStoreUrlIos(), value.getStoreUrlAndroid(),
                value.getForceUpdateMessage(), value.getLastUpdate());
    }

    private MobileConfigurationWorkflow.DivisionView division(
            com.blockout.config.client.model.DivisionInternalResponse value) {
        return new MobileConfigurationWorkflow.DivisionView(value.getId(), value.getName(), value.getMainColor(),
                value.getFirstGradientColor(), value.getSecondGradientColor(), value.getThirdGradientColor(),
                value.getLogoUrl(), value.getActive());
    }

    private MobileConfigurationWorkflow.RawMappingView rawMapping(
            com.blockout.config.client.model.RawDivisionMappingInternalResponse value) {
        return new MobileConfigurationWorkflow.RawMappingView(value.getId(), value.getRawDivisionName(), value.getDivisionId(),
                value.getFormat(), value.getGender(), value.getLeagueCode(), value.getSeason());
    }

    private MobileConfigurationWorkflow.ScraperStatusView scraper(
            com.blockout.config.client.model.ScraperStatusInternalResponse value) {
        return new MobileConfigurationWorkflow.ScraperStatusView(value.getName(), value.getEnabled());
    }
}
