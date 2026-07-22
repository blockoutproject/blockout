package com.blockout.clubs.club.api.mappers;

import com.blockout.clubs.club.api.models.ClubInternalResponse;
import com.blockout.clubs.club.api.models.CreateClubInternalRequest;
import com.blockout.clubs.club.api.models.UpdateClubInternalRequest;
import com.blockout.clubs.club.application.commands.ClubImageCommand;
import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.commands.UpdateClubCommand;
import com.blockout.clubs.club.application.views.ClubView;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Maps generated Club API models to application contracts and back.
 */
@Component
public class ClubApiMapper {

    /**
     * Converts a create request and optional multipart file to an application command.
     */
    public CreateClubCommand toCommand(CreateClubInternalRequest request, MultipartFile image) {
        return new CreateClubCommand(
            request.getId(),
            request.getRawName(),
            request.getName(),
            request.getAddress(),
            request.getCity(),
            request.getPostalCode(),
            request.getEmail(),
            request.getPhoneNumber(),
            request.getWebsite(),
            request.getLogoUrl(),
            toImageCommand(image));
    }

    /**
     * Converts an update request and optional multipart file to an application command.
     */
    public UpdateClubCommand toCommand(UpdateClubInternalRequest request, MultipartFile image) {
        return new UpdateClubCommand(
            request.getRawName(),
            request.getName(),
            request.getAddress(),
            request.getCity(),
            request.getPostalCode(),
            request.getEmail(),
            request.getPhoneNumber(),
            request.getWebsite(),
            request.getLogoUrl(),
            toImageCommand(image));
    }

    /**
     * Converts the complete application view to the owned internal response.
     */
    public ClubInternalResponse toInternalResponse(ClubView view) {
        return new ClubInternalResponse(view.id(), view.rawName(), view.name(), view.active())
            .address(view.address())
            .city(view.city())
            .postalCode(view.postalCode())
            .email(view.email())
            .phoneNumber(view.phoneNumber())
            .website(view.website())
            .logoUrl(view.logoUrl())
            .latitude(view.latitude())
            .longitude(view.longitude())
            .createdAt(view.createdAt())
            .lastUpdate(view.lastUpdate());
    }

    /**
     * Copies multipart data into a framework-independent image command when present.
     */
    private ClubImageCommand toImageCommand(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return null;
        }
        try {
            return new ClubImageCommand(image.getBytes(), image.getOriginalFilename(), image.getContentType());
        } catch (java.io.IOException exception) {
            throw new IllegalArgumentException("The multipart image could not be read.", exception);
        }
    }
}
