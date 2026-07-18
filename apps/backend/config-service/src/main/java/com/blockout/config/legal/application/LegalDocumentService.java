package com.blockout.config.legal.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.shared.application.ChangeLog;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LegalDocumentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LegalDocumentService.class);

    private final LegalDocumentStore store;

    @Transactional(readOnly = true)
    public LegalDocumentSnapshot getByType(String type) {
        return store.findByType(type).orElseThrow(() -> notFound(type));
    }

    @Transactional
    public LegalDocumentSnapshot update(String type, UpdateLegalDocumentCommand command) {
        String normalizedType = type.toLowerCase().trim();
        LegalDocumentChange change = store.update(normalizedType, command).orElseThrow(() -> notFound(type));
        ChangeLog.logChanges(
                change.before(), change.after(), LOGGER, "update_legal_document", change.after().id());
        return change.after();
    }

    private LegalDocumentNotFoundException notFound(String type) {
        LOGGER.warn("Legal document not found", keyValue("type", type));
        return new LegalDocumentNotFoundException(type);
    }
}
