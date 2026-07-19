package com.blockout.config.legaldocument.api.mappers;

import com.blockout.config.legaldocument.api.models.LegalDocumentInternalResponse;
import com.blockout.config.legaldocument.api.models.UpdateLegalDocumentInternalRequest;
import com.blockout.config.legaldocument.application.commands.UpdateLegalDocumentCommand;
import com.blockout.config.legaldocument.application.views.LegalDocumentView;
import org.springframework.stereotype.Component;

/** Maps legal-document HTTP and application models. */
@Component
public class LegalDocumentApiMapper {

    /** Maps an update request to its application command. */
    public UpdateLegalDocumentCommand toCommand(UpdateLegalDocumentInternalRequest request) {
        return new UpdateLegalDocumentCommand(request.title(), request.version(), request.content());
    }

    /** Maps the authoritative view to the complete V1 response. */
    public LegalDocumentInternalResponse toInternalResponse(LegalDocumentView view) {
        return new LegalDocumentInternalResponse(view.id(), view.type(), view.title(), view.version(), view.content(),
                view.createdAt(), view.lastUpdate());
    }
}
