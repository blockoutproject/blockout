package com.blockout.config.legaldocument.application;

import com.blockout.config.legaldocument.application.commands.UpdateLegalDocumentCommand;
import com.blockout.config.legaldocument.application.views.LegalDocumentView;
import com.blockout.config.legaldocument.infrastructure.persistence.entities.LegalDocumentEntity;
import com.blockout.config.legaldocument.infrastructure.persistence.repositories.LegalDocumentRepository;
import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for legal documents. */
@Service
@RequiredArgsConstructor
public class LegalDocumentApplicationService implements LegalDocumentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LegalDocumentApplicationService.class);
    private final LegalDocumentRepository repository;

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public LegalDocumentView getByType(String type) {
        return toView(loadByType(type));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public LegalDocumentView update(String type, UpdateLegalDocumentCommand command) {
        LegalDocumentEntity document = loadByType(normalize(type));
        if (command.title() != null) document.setTitle(command.title());
        if (command.version() != null) document.setVersion(command.version());
        if (command.content() != null) document.setContent(command.content());
        LegalDocumentView updated = toView(repository.saveAndFlush(document));
        LOGGER.info("Updated legal document", keyValue("action", "update_legal_document"), keyValue("type", type));
        return updated;
    }

    /** Loads a document or raises the stable not-found error. */
    private LegalDocumentEntity loadByType(String type) {
        return repository.findByType(type).orElseThrow(() -> new ConfigResourceNotFoundException(
                "legal_document_not_found", "Legal document not found with type: " + type));
    }

    /** Normalizes mutable route input exactly as the legacy update did. */
    private String normalize(String type) {
        return type.toLowerCase().trim();
    }

    /** Maps persisted state to the authoritative application view. */
    private LegalDocumentView toView(LegalDocumentEntity document) {
        return new LegalDocumentView(document.getId(), document.getType(), document.getTitle(), document.getVersion(),
                document.getContent(), document.getCreatedAt(), document.getLastUpdate());
    }
}
