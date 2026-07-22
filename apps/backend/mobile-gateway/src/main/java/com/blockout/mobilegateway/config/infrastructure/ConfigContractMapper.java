package com.blockout.mobilegateway.config.infrastructure;

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
import com.blockout.mobilegateway.config.infrastructure.contract.models.AppStatusInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.CreateDivisionInternalRequest;
import com.blockout.mobilegateway.config.infrastructure.contract.models.CreateRawDivisionMappingInternalRequest;
import com.blockout.mobilegateway.config.infrastructure.contract.models.DivisionInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.LegalDocumentInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.RawDivisionMappingInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.ScraperStatusInternalResponse;
import com.blockout.mobilegateway.config.infrastructure.contract.models.UpdateAppStatusInternalRequest;
import com.blockout.mobilegateway.config.infrastructure.contract.models.UpdateDivisionInternalRequest;
import com.blockout.mobilegateway.config.infrastructure.contract.models.UpdateLegalDocumentInternalRequest;
import com.blockout.mobilegateway.config.infrastructure.contract.models.UpdateRawDivisionMappingInternalRequest;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import org.springframework.stereotype.Component;

/** Maps generated config-service models at the internal HTTP adapter boundary. */
@Component
public class ConfigContractMapper {

    public AppStatusView toResponse(AppStatusInternalResponse source) {
        return new AppStatusView(
            source.getMaintenance(), source.getMessage(), source.getImageUrl(), source.getMinVersionIos(),
            source.getMinVersionAndroid(), source.getStoreUrlIos(), source.getStoreUrlAndroid(),
            source.getForceUpdateMessage(), source.getLastUpdate());
    }

    public UpdateAppStatusInternalRequest toInternalRequest(UpdateAppStatusCommand command) {
        return new UpdateAppStatusInternalRequest()
            .maintenance(command.maintenance())
            .message(command.message())
            .imageUrl(command.imageUrl())
            .minVersionIos(command.minVersionIos())
            .minVersionAndroid(command.minVersionAndroid())
            .storeUrlIos(command.storeUrlIos())
            .storeUrlAndroid(command.storeUrlAndroid())
            .forceUpdateMessage(command.forceUpdateMessage());
    }

    public DivisionView toResponse(DivisionInternalResponse source) {
        return new DivisionView(
            source.getId(), source.getName(), source.getMainColor(), source.getFirstGradientColor(),
            source.getSecondGradientColor(), source.getThirdGradientColor(), source.getLogoUrl(), source.getActive(),
            source.getCreatedAt(), source.getLastUpdate());
    }

    public CreateDivisionInternalRequest toCreateRequest(UpsertDivisionCommand command) {
        return new CreateDivisionInternalRequest(
            command.name(), command.mainColor(), command.firstGradientColor(),
            command.secondGradientColor(), command.thirdGradientColor());
    }

    public UpdateDivisionInternalRequest toUpdateRequest(UpsertDivisionCommand command) {
        return new UpdateDivisionInternalRequest()
            .name(command.name())
            .mainColor(command.mainColor())
            .firstGradientColor(command.firstGradientColor())
            .secondGradientColor(command.secondGradientColor())
            .thirdGradientColor(command.thirdGradientColor());
    }

    public LegalDocumentView toResponse(LegalDocumentInternalResponse source) {
        return new LegalDocumentView(
            source.getId(), source.getType(), source.getTitle(), source.getVersion(), source.getContent(),
            source.getCreatedAt(), source.getLastUpdate());
    }

    public UpdateLegalDocumentInternalRequest toInternalRequest(UpdateLegalDocumentCommand command) {
        return new UpdateLegalDocumentInternalRequest()
            .title(command.title())
            .version(command.version())
            .content(command.content());
    }

    public RawDivisionMappingView toResponse(RawDivisionMappingInternalResponse source) {
        return new RawDivisionMappingView(
            source.getId(), source.getRawDivisionName(), source.getDivisionId(), toFormat(source.getFormat()),
            toGender(source.getGender()), source.getLeagueCode(), source.getSeason(), source.getCreatedAt(),
            source.getLastUpdate(), source.getMapped());
    }

    public CreateRawDivisionMappingInternalRequest toCreateRequest(CreateRawDivisionMappingCommand command) {
        return new CreateRawDivisionMappingInternalRequest(
            command.rawDivisionName(), command.leagueCode(), command.season())
            .divisionId(command.divisionId())
            .format(toFormatEnum(command.format()))
            .gender(toGenderEnum(command.gender()));
    }

    public UpdateRawDivisionMappingInternalRequest toInternalRequest(UpdateRawDivisionMappingCommand command) {
        return new UpdateRawDivisionMappingInternalRequest()
            .divisionId(command.divisionId())
            .format(toFormatEnum(command.format()))
            .gender(toGenderEnum(command.gender()));
    }

    public ScraperStatusView toResponse(ScraperStatusInternalResponse source) {
        return new ScraperStatusView(
            source.getId(), source.getName().getValue(), source.getEnabled(), source.getLastUpdate());
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
