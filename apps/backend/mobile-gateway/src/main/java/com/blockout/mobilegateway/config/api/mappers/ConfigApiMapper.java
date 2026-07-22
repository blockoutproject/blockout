package com.blockout.mobilegateway.config.api.mappers;

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

    /**
     * Maps the application status view to the public response.
     *
     * @param source application status view.
     * @return generated public response.
     */
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

    /**
     * Maps a public status request to the application command.
     *
     * @param source generated public request.
     * @return application update command.
     */
    public UpdateAppStatusCommand toCommand(UpdateAppStatusRequest source) {
        return new UpdateAppStatusCommand(
            source.getMaintenance(), source.getMessage(), source.getImageUrl(), source.getMinVersionIos(),
            source.getMinVersionAndroid(), source.getStoreUrlIos(), source.getStoreUrlAndroid(),
            source.getForceUpdateMessage());
    }

    /**
     * Maps an application division view to the public response.
     *
     * @param source application division view.
     * @return generated public response.
     */
    public DivisionResponse toResponse(DivisionView source) {
        return new DivisionResponse(
            source.id(), source.name(), source.mainColor(), source.firstGradientColor(),
            source.secondGradientColor(), source.thirdGradientColor(), source.active(),
            source.createdAt(), source.lastUpdate())
            .logoUrl(source.logoUrl());
    }

    /**
     * Maps a public division request to the application command.
     *
     * @param source generated public request.
     * @return application upsert command.
     */
    public UpsertDivisionCommand toCommand(UpsertDivisionRequest source) {
        return new UpsertDivisionCommand(
            source.getName(), source.getMainColor(), source.getFirstGradientColor(),
            source.getSecondGradientColor(), source.getThirdGradientColor());
    }

    /**
     * Maps an application legal-document view to the public response.
     *
     * @param source application legal-document view.
     * @return generated public response.
     */
    public LegalDocumentResponse toResponse(LegalDocumentView source) {
        return new LegalDocumentResponse(
            source.id(), source.type(), source.title(), source.version(), source.content(),
            source.createdAt(), source.lastUpdate());
    }

    /**
     * Maps a public legal-document request to the application command.
     *
     * @param source generated public request.
     * @return application update command.
     */
    public UpdateLegalDocumentCommand toCommand(UpdateLegalDocumentRequest source) {
        return new UpdateLegalDocumentCommand(source.getTitle(), source.getVersion(), source.getContent());
    }

    /**
     * Maps an application raw-division view to the public response.
     *
     * @param source application raw-division view.
     * @return generated public response.
     */
    public RawDivisionMappingResponse toResponse(RawDivisionMappingView source) {
        return new RawDivisionMappingResponse(
            source.id(), source.rawDivisionName(), source.leagueCode(), source.season(),
            source.createdAt(), source.lastUpdate(), source.mapped())
            .divisionId(source.divisionId())
            .format(toFormatEnum(source.format()))
            .gender(toGenderEnum(source.gender()));
    }

    /**
     * Maps a public raw-division create request to the application command.
     *
     * @param source generated public request.
     * @return application create command.
     */
    public CreateRawDivisionMappingCommand toCommand(CreateRawDivisionMappingRequest source) {
        return new CreateRawDivisionMappingCommand(
            source.getRawDivisionName(), source.getDivisionId(), toFormat(source.getFormat()),
            toGender(source.getGender()), source.getLeagueCode(), source.getSeason());
    }

    /**
     * Maps a public raw-division update request to the application command.
     *
     * @param source generated public request.
     * @return application update command.
     */
    public UpdateRawDivisionMappingCommand toCommand(UpdateRawDivisionMappingRequest source) {
        return new UpdateRawDivisionMappingCommand(
            source.getDivisionId(), toFormat(source.getFormat()), toGender(source.getGender()));
    }

    /**
     * Maps an application scraper-status view to the public response.
     *
     * @param source application scraper-status view.
     * @return generated public response.
     */
    public ScraperStatusResponse toResponse(ScraperStatusView source) {
        return new ScraperStatusResponse(
            source.id(), ScraperNameEnum.fromValue(source.name()), source.enabled(), source.lastUpdate());
    }

    /**
     * Converts a generated Format enum to the application enum.
     *
     * @param source generated Format value.
     * @return application Format value, or {@code null}.
     */
    private Format toFormat(FormatEnum source) {
        return source == null ? null : Format.valueOf(source.name());
    }

    /**
     * Converts a generated Gender enum to the application enum.
     *
     * @param source generated Gender value.
     * @return application Gender value, or {@code null}.
     */
    private Gender toGender(GenderEnum source) {
        return source == null ? null : Gender.valueOf(source.name());
    }

    /**
     * Converts an application Format enum to the generated enum.
     *
     * @param source application Format value.
     * @return generated Format value, or {@code null}.
     */
    private FormatEnum toFormatEnum(Format source) {
        return source == null ? null : FormatEnum.valueOf(source.name());
    }

    /**
     * Converts an application Gender enum to the generated enum.
     *
     * @param source application Gender value.
     * @return generated Gender value, or {@code null}.
     */
    private GenderEnum toGenderEnum(Gender source) {
        return source == null ? null : GenderEnum.valueOf(source.name());
    }
}
