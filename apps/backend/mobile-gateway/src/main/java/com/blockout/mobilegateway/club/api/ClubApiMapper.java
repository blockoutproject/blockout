package com.blockout.mobilegateway.club.api;

import com.blockout.mobilegateway.api.models.ClubResponse;
import com.blockout.mobilegateway.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.club.application.commands.UpdateClubCommand;
import com.blockout.mobilegateway.club.application.views.ClubView;
import org.springframework.stereotype.Component;

/** Maps Club application data to the generated mobile API contract. */
@Component
public class ClubApiMapper {

    public ClubResponse toResponse(ClubView source) {
        return new ClubResponse(source.id(), source.rawName(), source.name(), source.active())
            .address(source.address())
            .city(source.city())
            .postalCode(source.postalCode())
            .email(source.email())
            .phoneNumber(source.phoneNumber())
            .website(source.website())
            .logoUrl(source.logoUrl())
            .latitude(source.latitude())
            .longitude(source.longitude())
            .createdAt(source.createdAt())
            .lastUpdate(source.lastUpdate());
    }

    public UpdateClubCommand toCommand(UpdateClubRequest source) {
        return new UpdateClubCommand(
            source.getRawName(), source.getName(), source.getAddress(), source.getCity(), source.getPostalCode(),
            source.getLogoUrl(), source.getEmail(), source.getPhoneNumber(), source.getWebsite());
    }
}
