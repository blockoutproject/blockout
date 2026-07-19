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

import java.io.IOException;

/**
 * Maps handwritten Club API models to application contracts and back.
 */
@Component
public class ClubApiMapper {

    /**
     * Converts a create request and optional multipart file to an application command.
     */
    public CreateClubCommand toCommand(CreateClubInternalRequest request, MultipartFile image) throws IOException {
        return new CreateClubCommand(
                request.id(),
                request.rawName(),
                request.name(),
                request.address(),
                request.city(),
                request.postalCode(),
                request.email(),
                request.phoneNumber(),
                request.website(),
                request.logoUrl(),
                toImageCommand(image));
    }

    /**
     * Converts an update request and optional multipart file to an application command.
     */
    public UpdateClubCommand toCommand(UpdateClubInternalRequest request, MultipartFile image) throws IOException {
        return new UpdateClubCommand(
                request.rawName(),
                request.name(),
                request.address(),
                request.city(),
                request.postalCode(),
                request.email(),
                request.phoneNumber(),
                request.website(),
                request.logoUrl(),
                toImageCommand(image));
    }

    /**
     * Converts the complete application view to the owned internal response.
     */
    public ClubInternalResponse toInternalResponse(ClubView view) {
        return new ClubInternalResponse(
                view.id(),
                view.rawName(),
                view.name(),
                view.address(),
                view.city(),
                view.postalCode(),
                view.email(),
                view.phoneNumber(),
                view.website(),
                view.logoUrl(),
                view.active(),
                view.latitude(),
                view.longitude(),
                view.createdAt(),
                view.lastUpdate());
    }

    /**
     * Copies multipart data into a framework-independent image command when present.
     */
    private ClubImageCommand toImageCommand(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty()) {
            return null;
        }
        return new ClubImageCommand(image.getBytes(), image.getOriginalFilename(), image.getContentType());
    }
}
