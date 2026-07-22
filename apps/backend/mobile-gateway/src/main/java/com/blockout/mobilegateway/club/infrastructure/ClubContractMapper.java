package com.blockout.mobilegateway.club.infrastructure;

import com.blockout.mobilegateway.club.application.commands.UpdateClubCommand;
import com.blockout.mobilegateway.club.application.views.ClubView;
import com.blockout.mobilegateway.club.infrastructure.contract.models.ClubInternalResponse;
import com.blockout.mobilegateway.club.infrastructure.contract.models.UpdateClubInternalRequest;
import org.springframework.stereotype.Component;

/**
 * Maps generated internal Club contracts at the gateway adapter boundary.
 */
@Component
public class ClubContractMapper {

    /**
     * Converts an internal Club response to an application view.
     */
    public ClubView toResponse(ClubInternalResponse club) {
        if (club == null) {
            return null;
        }
        return new ClubView(
            club.getId(), club.getRawName(), club.getName(), club.getAddress(), club.getCity(),
            club.getPostalCode(), club.getEmail(), club.getPhoneNumber(), club.getWebsite(), club.getLogoUrl(),
            club.getLatitude(), club.getLongitude(), club.getActive(), club.getCreatedAt(), club.getLastUpdate());
    }

    /**
     * Converts the public update input to the generated internal request.
     */
    public UpdateClubInternalRequest toInternalRequest(UpdateClubCommand command) {
        return new UpdateClubInternalRequest()
            .rawName(command.rawName())
            .name(command.name())
            .address(command.address())
            .city(command.city())
            .postalCode(command.postalCode())
            .email(command.email())
            .phoneNumber(command.phoneNumber())
            .website(command.website())
            .logoUrl(command.logoUrl());
    }
}
