package com.blockout.config.legaldocument.application;

import com.blockout.config.legaldocument.application.commands.UpdateLegalDocumentCommand;
import com.blockout.config.legaldocument.application.views.LegalDocumentView;

/** Defines legal-document use cases independently of transport and persistence. */
public interface LegalDocumentService {

    /** Returns one document by type. */
    LegalDocumentView getByType(String type);

    /** Applies a partial document update. */
    LegalDocumentView update(String type, UpdateLegalDocumentCommand command);
}
