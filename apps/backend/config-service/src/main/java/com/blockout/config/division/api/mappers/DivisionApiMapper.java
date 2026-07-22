package com.blockout.config.division.api.mappers;

import com.blockout.config.contract.model.CreateDivisionInternalRequest;
import com.blockout.config.contract.model.DivisionInternalResponse;
import com.blockout.config.contract.model.UpdateDivisionInternalRequest;
import com.blockout.config.division.application.commands.CreateDivisionCommand;
import com.blockout.config.division.application.commands.DivisionImageCommand;
import com.blockout.config.division.application.commands.UpdateDivisionCommand;
import com.blockout.config.division.application.views.DivisionView;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Maps Division HTTP models to and from application models.
 */
@Component
public class DivisionApiMapper {

    /**
     * Maps a create request and optional upload to a command.
     */
    public CreateDivisionCommand toCommand(CreateDivisionInternalRequest request, MultipartFile image) {
        return new CreateDivisionCommand(request.getName(), request.getMainColor(), request.getFirstGradientColor(),
            request.getSecondGradientColor(), request.getThirdGradientColor(), toImageCommand(image));
    }

    /**
     * Maps an update request and optional upload to a command.
     */
    public UpdateDivisionCommand toCommand(UpdateDivisionInternalRequest request, MultipartFile image) {
        return new UpdateDivisionCommand(request.getName(), request.getMainColor(), request.getFirstGradientColor(),
            request.getSecondGradientColor(), request.getThirdGradientColor(), toImageCommand(image));
    }

    /**
     * Maps an application view to the complete V1 response.
     */
    public DivisionInternalResponse toInternalResponse(DivisionView view) {
        return new DivisionInternalResponse(view.id(), view.name(), view.mainColor(), view.firstGradientColor(),
            view.secondGradientColor(), view.thirdGradientColor(), view.active())
            .logoUrl(view.logoUrl())
            .createdAt(view.createdAt())
            .lastUpdate(view.lastUpdate());
    }

    /**
     * Copies multipart data into the framework-independent application command.
     */
    private DivisionImageCommand toImageCommand(MultipartFile image) {
        if (image == null || image.isEmpty()) return null;
        try {
            return new DivisionImageCommand(image.getOriginalFilename(), image.getContentType(), image.getBytes());
        } catch (java.io.IOException exception) {
            throw new IllegalArgumentException("The multipart image could not be read.", exception);
        }
    }
}
