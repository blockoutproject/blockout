package com.blockout.config.division.api.mappers;

import com.blockout.config.division.api.models.CreateDivisionInternalRequest;
import com.blockout.config.division.api.models.DivisionInternalResponse;
import com.blockout.config.division.api.models.UpdateDivisionInternalRequest;
import com.blockout.config.division.application.commands.CreateDivisionCommand;
import com.blockout.config.division.application.commands.DivisionImageCommand;
import com.blockout.config.division.application.commands.UpdateDivisionCommand;
import com.blockout.config.division.application.views.DivisionView;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Maps Division HTTP models to and from application models.
 */
@Component
public class DivisionApiMapper {

    /**
     * Maps a create request and optional upload to a command.
     */
    public CreateDivisionCommand toCommand(CreateDivisionInternalRequest request, MultipartFile image) throws IOException {
        return new CreateDivisionCommand(request.name(), request.mainColor(), request.firstGradientColor(),
            request.secondGradientColor(), request.thirdGradientColor(), toImageCommand(image));
    }

    /**
     * Maps an update request and optional upload to a command.
     */
    public UpdateDivisionCommand toCommand(UpdateDivisionInternalRequest request, MultipartFile image) throws IOException {
        return new UpdateDivisionCommand(request.name(), request.mainColor(), request.firstGradientColor(),
            request.secondGradientColor(), request.thirdGradientColor(), toImageCommand(image));
    }

    /**
     * Maps an application view to the complete V1 response.
     */
    public DivisionInternalResponse toInternalResponse(DivisionView view) {
        return new DivisionInternalResponse(view.id(), view.name(), view.mainColor(), view.firstGradientColor(),
            view.secondGradientColor(), view.thirdGradientColor(), view.logoUrl(), view.active(), view.createdAt(),
            view.lastUpdate());
    }

    /**
     * Copies multipart data into the framework-independent application command.
     */
    private DivisionImageCommand toImageCommand(MultipartFile image) throws IOException {
        if (image == null) return null;
        return new DivisionImageCommand(image.getOriginalFilename(), image.getContentType(), image.getBytes());
    }
}
