package com.blockout.config.rawdivisionmapping.api.mappers;

import com.blockout.config.rawdivisionmapping.api.models.CreateRawDivisionMappingInternalRequest;
import com.blockout.config.rawdivisionmapping.api.models.RawDivisionMappingInternalResponse;
import com.blockout.config.rawdivisionmapping.api.models.UpdateRawDivisionMappingInternalRequest;
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
        return new CreateRawDivisionMappingCommand(request.rawDivisionName(), request.divisionId(), request.format(),
            request.gender(), request.leagueCode(), request.season());
    }

    /**
     * Maps an update request to its application command.
     */
    public UpdateRawDivisionMappingCommand toCommand(UpdateRawDivisionMappingInternalRequest request) {
        return new UpdateRawDivisionMappingCommand(request.divisionId(), request.format(), request.gender());
    }

    /**
     * Maps the authoritative view to the complete V1 response.
     */
    public RawDivisionMappingInternalResponse toInternalResponse(RawDivisionMappingView view) {
        return new RawDivisionMappingInternalResponse(view.id(), view.rawDivisionName(), view.divisionId(), view.format(),
            view.gender(), view.leagueCode(), view.season(), view.createdAt(), view.lastUpdate(), view.mapped());
    }
}
