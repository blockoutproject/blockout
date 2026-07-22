package com.blockout.config.rawdivisionmapping.api.mappers;

import com.blockout.config.contract.model.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.contract.model.RawDivisionMappingInternalResponse;
import com.blockout.config.contract.model.UpdateRawDivisionMappingInternalRequest;
import com.blockout.config.rawdivisionmapping.application.commands.CreateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.commands.UpdateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;
import org.springframework.stereotype.Component;

/**
 * Maps RawDivisionMapping HTTP and application models.
 */
@Component
public class RawDivisionMappingApiMapper {

    /**
     * Maps a create request to its application command.
     */
    public CreateRawDivisionMappingCommand toCommand(CreateRawDivisionMappingInternalRequest request) {
        return new CreateRawDivisionMappingCommand(
            request.getRawDivisionName(), request.getDivisionId(), toFormat(request.getFormat()),
            toGender(request.getGender()), request.getLeagueCode(), request.getSeason());
    }

    /**
     * Maps an update request to its application command.
     */
    public UpdateRawDivisionMappingCommand toCommand(UpdateRawDivisionMappingInternalRequest request) {
        return new UpdateRawDivisionMappingCommand(
            request.getDivisionId(), toFormat(request.getFormat()), toGender(request.getGender()));
    }

    /**
     * Maps the authoritative view to the complete V1 response.
     */
    public RawDivisionMappingInternalResponse toInternalResponse(RawDivisionMappingView view) {
        return new RawDivisionMappingInternalResponse(
            view.id(), view.rawDivisionName(), view.leagueCode(), view.season(), view.mapped())
            .divisionId(view.divisionId())
            .format(view.format() == null ? null : com.blockout.shared.model.FormatEnum.valueOf(view.format().name()))
            .gender(view.gender() == null ? null : com.blockout.shared.model.GenderEnum.valueOf(view.gender().name()))
            .createdAt(view.createdAt())
            .lastUpdate(view.lastUpdate());
    }

    private com.blockout.config.rawdivisionmapping.application.models.Format toFormat(
        com.blockout.shared.model.FormatEnum format) {
        return format == null
            ? null
            : com.blockout.config.rawdivisionmapping.application.models.Format.valueOf(format.name());
    }

    private com.blockout.config.rawdivisionmapping.application.models.Gender toGender(
        com.blockout.shared.model.GenderEnum gender) {
        return gender == null
            ? null
            : com.blockout.config.rawdivisionmapping.application.models.Gender.valueOf(gender.name());
    }
}
