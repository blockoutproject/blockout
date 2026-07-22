package com.blockout.config.legaldocument.api.mappers;

import com.blockout.config.contract.model.LegalDocumentInternalResponse;
import com.blockout.config.contract.model.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legaldocument.application.commands.UpdateLegalDocumentCommand;
import com.blockout.config.legaldocument.application.views.LegalDocumentView;
import org.springframework.stereotype.Component;

/**
 * Maps legal-document HTTP and application models.
 */
@Component
public class LegalDocumentApiMapper {

    /**
     * Maps an update request to its application command.
     */
    public UpdateLegalDocumentCommand toCommand(UpdateLegalDocumentInternalRequest request) {
        return new UpdateLegalDocumentCommand(request.getTitle(), request.getVersion(), request.getContent());
    }

    /**
     * Maps the authoritative view to the complete V1 response.
     */
    public LegalDocumentInternalResponse toInternalResponse(LegalDocumentView view) {
        return new LegalDocumentInternalResponse(view.id(), view.type(), view.title(), view.version(), view.content())
            .createdAt(view.createdAt())
            .lastUpdate(view.lastUpdate());
    }
}
