package com.blockout.config.legaldocument.api.mappers;

import com.blockout.config.contract.model.LegalDocumentInternalResponse;
import com.blockout.config.contract.model.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legaldocument.application.commands.UpdateLegalDocumentCommand;
import com.blockout.config.legaldocument.application.views.LegalDocumentView;
import com.blockout.config.shared.api.mappers.ConfigMapperConfig;
import org.mapstruct.Mapper;

/**
 * Maps legal-document transport models to application contracts and back.
 */
@Mapper(config = ConfigMapperConfig.class)
public interface LegalDocumentApiMapper {

    /**
     * Maps an internal update request to the application command.
     *
     * @param request internal legal-document request.
     * @return application update command.
     */
    UpdateLegalDocumentCommand toCommand(UpdateLegalDocumentInternalRequest request);

    /**
     * Maps the authoritative application view to the internal response.
     *
     * @param view application legal-document view.
     * @return generated internal response.
     */
    LegalDocumentInternalResponse toInternalResponse(LegalDocumentView view);
}
