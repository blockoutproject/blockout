package com.blockout.mobilegateway.config.infrastructure;

import com.blockout.mobilegateway.config.api.models.AppStatusResponse;
import com.blockout.mobilegateway.config.api.models.DivisionResponse;
import com.blockout.mobilegateway.config.api.models.LegalDocumentResponse;
import com.blockout.mobilegateway.config.api.models.RawDivisionMappingResponse;
import com.blockout.mobilegateway.config.api.models.ScraperStatusResponse;
import com.blockout.mobilegateway.config.api.models.UpdateAppStatusRequest;
import com.blockout.mobilegateway.config.api.models.UpdateLegalDocumentRequest;
import com.blockout.mobilegateway.config.api.models.UpdateRawDivisionMappingRequest;
import com.blockout.mobilegateway.config.api.models.UpsertDivisionRequest;
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

/**
 * Maps generated config-service models at the internal HTTP adapter boundary.
 */
@Component
public class ConfigContractMapper {

    public AppStatusResponse toResponse(AppStatusInternalResponse source) {
        return AppStatusResponse.builder()
            .maintenance(source.getMaintenance())
            .message(source.getMessage())
            .imageUrl(source.getImageUrl())
            .minVersionIos(source.getMinVersionIos())
            .minVersionAndroid(source.getMinVersionAndroid())
            .storeUrlIos(source.getStoreUrlIos())
            .storeUrlAndroid(source.getStoreUrlAndroid())
            .forceUpdateMessage(source.getForceUpdateMessage())
            .lastUpdate(source.getLastUpdate())
            .build();
    }

    public UpdateAppStatusInternalRequest toInternalRequest(UpdateAppStatusRequest source) {
        return new UpdateAppStatusInternalRequest()
            .maintenance(source.getMaintenance())
            .message(source.getMessage())
            .imageUrl(source.getImageUrl())
            .minVersionIos(source.getMinVersionIos())
            .minVersionAndroid(source.getMinVersionAndroid())
            .storeUrlIos(source.getStoreUrlIos())
            .storeUrlAndroid(source.getStoreUrlAndroid())
            .forceUpdateMessage(source.getForceUpdateMessage());
    }

    public DivisionResponse toResponse(DivisionInternalResponse source) {
        return DivisionResponse.builder()
            .id(source.getId())
            .name(source.getName())
            .mainColor(source.getMainColor())
            .firstGradientColor(source.getFirstGradientColor())
            .secondGradientColor(source.getSecondGradientColor())
            .thirdGradientColor(source.getThirdGradientColor())
            .logoUrl(source.getLogoUrl())
            .active(source.getActive())
            .createdAt(source.getCreatedAt())
            .lastUpdate(source.getLastUpdate())
            .build();
    }

    public CreateDivisionInternalRequest toCreateRequest(UpsertDivisionRequest source) {
        return new CreateDivisionInternalRequest(
            source.getName(), source.getMainColor(), source.getFirstGradientColor(),
            source.getSecondGradientColor(), source.getThirdGradientColor());
    }

    public UpdateDivisionInternalRequest toUpdateRequest(UpsertDivisionRequest source) {
        return new UpdateDivisionInternalRequest()
            .name(source.getName())
            .mainColor(source.getMainColor())
            .firstGradientColor(source.getFirstGradientColor())
            .secondGradientColor(source.getSecondGradientColor())
            .thirdGradientColor(source.getThirdGradientColor());
    }

    public LegalDocumentResponse toResponse(LegalDocumentInternalResponse source) {
        return new LegalDocumentResponse(
            source.getId(), source.getType(), source.getTitle(), source.getVersion(), source.getContent(),
            source.getCreatedAt(), source.getLastUpdate());
    }

    public UpdateLegalDocumentInternalRequest toInternalRequest(UpdateLegalDocumentRequest source) {
        return new UpdateLegalDocumentInternalRequest()
            .title(source.getTitle())
            .version(source.getVersion())
            .content(source.getContent());
    }

    public RawDivisionMappingResponse toResponse(RawDivisionMappingInternalResponse source) {
        return new RawDivisionMappingResponse(
            source.getId(), source.getRawDivisionName(), source.getDivisionId(), toFormat(source.getFormat()),
            toGender(source.getGender()), source.getLeagueCode(), source.getSeason(), source.getCreatedAt(),
            source.getLastUpdate(), source.getMapped());
    }

    public CreateRawDivisionMappingInternalRequest toCreateRequest(RawDivisionMappingResponse source) {
        return new CreateRawDivisionMappingInternalRequest(
            source.getRawDivisionName(), source.getLeagueCode(), source.getSeason())
            .divisionId(source.getDivisionId())
            .format(toFormatEnum(source.getFormat()))
            .gender(toGenderEnum(source.getGender()));
    }

    public UpdateRawDivisionMappingInternalRequest toInternalRequest(UpdateRawDivisionMappingRequest source) {
        return new UpdateRawDivisionMappingInternalRequest()
            .divisionId(source.getDivisionId())
            .format(toFormatEnum(source.getFormat()))
            .gender(toGenderEnum(source.getGender()));
    }

    public ScraperStatusResponse toResponse(ScraperStatusInternalResponse source) {
        return new ScraperStatusResponse(
            source.getId(), source.getName().getValue(), source.getEnabled(), source.getLastUpdate());
    }

    private Format toFormat(FormatEnum format) {
        return format == null ? null : Format.valueOf(format.name());
    }

    private Gender toGender(GenderEnum gender) {
        return gender == null ? null : Gender.valueOf(gender.name());
    }

    private FormatEnum toFormatEnum(Format format) {
        return format == null ? null : FormatEnum.valueOf(format.name());
    }

    private GenderEnum toGenderEnum(Gender gender) {
        return gender == null ? null : GenderEnum.valueOf(gender.name());
    }
}
