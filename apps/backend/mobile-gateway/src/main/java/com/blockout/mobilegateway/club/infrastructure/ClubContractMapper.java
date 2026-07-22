package com.blockout.mobilegateway.club.infrastructure;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.club.infrastructure.contract.models.ClubInternalResponse;
import com.blockout.mobilegateway.club.infrastructure.contract.models.UpdateClubInternalRequest;
import org.springframework.stereotype.Component;

/**
 * Maps generated internal Club contracts at the gateway adapter boundary.
 */
@Component
public class ClubContractMapper {

    /**
     * Converts an internal Club response to the existing public gateway response.
     */
    public ClubResponse toResponse(ClubInternalResponse club) {
        if (club == null) {
            return null;
        }
        return ClubResponse.builder()
            .id(club.getId())
            .rawName(club.getRawName())
            .name(club.getName())
            .address(club.getAddress())
            .city(club.getCity())
            .postalCode(club.getPostalCode())
            .email(club.getEmail())
            .phoneNumber(club.getPhoneNumber())
            .website(club.getWebsite())
            .logoUrl(club.getLogoUrl())
            .active(club.getActive())
            .latitude(club.getLatitude())
            .longitude(club.getLongitude())
            .createdAt(club.getCreatedAt())
            .lastUpdate(club.getLastUpdate())
            .build();
    }

    /**
     * Converts the public update input to the generated internal request.
     */
    public UpdateClubInternalRequest toInternalRequest(UpdateClubRequest request) {
        return new UpdateClubInternalRequest()
            .rawName(request.getRawName())
            .name(request.getName())
            .address(request.getAddress())
            .city(request.getCity())
            .postalCode(request.getPostalCode())
            .email(request.getEmail())
            .phoneNumber(request.getPhoneNumber())
            .website(request.getWebsite())
            .logoUrl(request.getLogoUrl());
    }
}
