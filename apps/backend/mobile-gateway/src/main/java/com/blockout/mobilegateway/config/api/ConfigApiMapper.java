package com.blockout.mobilegateway.config.api;

import com.blockout.mobilegateway.api.models.AppStatusResponse;
import com.blockout.mobilegateway.api.models.CreateRawDivisionMappingRequest;
import com.blockout.mobilegateway.api.models.DivisionResponse;
import com.blockout.mobilegateway.api.models.LegalDocumentResponse;
import com.blockout.mobilegateway.api.models.RawDivisionMappingResponse;
import com.blockout.mobilegateway.api.models.ScraperStatusResponse;
import com.blockout.mobilegateway.api.models.UpdateAppStatusRequest;
import com.blockout.mobilegateway.api.models.UpdateLegalDocumentRequest;
import com.blockout.mobilegateway.api.models.UpdateRawDivisionMappingRequest;
import com.blockout.mobilegateway.api.models.UpsertDivisionRequest;
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
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.ScraperNameEnum;
import org.springframework.stereotype.Component;

/** Maps configuration application data to the generated mobile API contract. */
@Component
public class ConfigApiMapper {

    public AppStatusResponse toResponse(AppStatusView source) {
        return new AppStatusResponse(source.maintenance())
            .message(source.message())
            .imageUrl(source.imageUrl())
            .minVersionIos(source.minVersionIos())
            .minVersionAndroid(source.minVersionAndroid())
            .storeUrlIos(source.storeUrlIos())
            .storeUrlAndroid(source.storeUrlAndroid())
            .forceUpdateMessage(source.forceUpdateMessage())
            .lastUpdate(source.lastUpdate());
    }

    public UpdateAppStatusCommand toCommand(UpdateAppStatusRequest source) {
        return new UpdateAppStatusCommand(
            source.getMaintenance(), source.getMessage(), source.getImageUrl(), source.getMinVersionIos(),
            source.getMinVersionAndroid(), source.getStoreUrlIos(), source.getStoreUrlAndroid(),
            source.getForceUpdateMessage());
    }

    public DivisionResponse toResponse(DivisionView source) {
        return new DivisionResponse(
            source.id(), source.name(), source.mainColor(), source.firstGradientColor(),
            source.secondGradientColor(), source.thirdGradientColor(), source.active(),
            source.createdAt(), source.lastUpdate())
            .logoUrl(source.logoUrl());
    }

    public UpsertDivisionCommand toCommand(UpsertDivisionRequest source) {
        return new UpsertDivisionCommand(
            source.getName(), source.getMainColor(), source.getFirstGradientColor(),
            source.getSecondGradientColor(), source.getThirdGradientColor());
    }

    public LegalDocumentResponse toResponse(LegalDocumentView source) {
        return new LegalDocumentResponse(
            source.id(), source.type(), source.title(), source.version(), source.content(),
            source.createdAt(), source.lastUpdate());
    }

    public UpdateLegalDocumentCommand toCommand(UpdateLegalDocumentRequest source) {
        return new UpdateLegalDocumentCommand(source.getTitle(), source.getVersion(), source.getContent());
    }

    public RawDivisionMappingResponse toResponse(RawDivisionMappingView source) {
        return new RawDivisionMappingResponse(
            source.id(), source.rawDivisionName(), source.leagueCode(), source.season(),
            source.createdAt(), source.lastUpdate(), source.mapped())
            .divisionId(source.divisionId())
            .format(toFormatEnum(source.format()))
            .gender(toGenderEnum(source.gender()));
    }

    public CreateRawDivisionMappingCommand toCommand(CreateRawDivisionMappingRequest source) {
        return new CreateRawDivisionMappingCommand(
            source.getRawDivisionName(), source.getDivisionId(), toFormat(source.getFormat()),
            toGender(source.getGender()), source.getLeagueCode(), source.getSeason());
    }

    public UpdateRawDivisionMappingCommand toCommand(UpdateRawDivisionMappingRequest source) {
        return new UpdateRawDivisionMappingCommand(
            source.getDivisionId(), toFormat(source.getFormat()), toGender(source.getGender()));
    }

    public ScraperStatusResponse toResponse(ScraperStatusView source) {
        return new ScraperStatusResponse(
            source.id(), ScraperNameEnum.fromValue(source.name()), source.enabled(), source.lastUpdate());
    }

    private Format toFormat(FormatEnum source) {
        return source == null ? null : Format.valueOf(source.name());
    }

    private Gender toGender(GenderEnum source) {
        return source == null ? null : Gender.valueOf(source.name());
    }

    private FormatEnum toFormatEnum(Format source) {
        return source == null ? null : FormatEnum.valueOf(source.name());
    }

    private GenderEnum toGenderEnum(Gender source) {
        return source == null ? null : GenderEnum.valueOf(source.name());
    }
}
