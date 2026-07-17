package com.blockout.config.legal.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.exceptions.LegalDocumentNotFoundException;
import com.blockout.config.legal.persistence.LegalDocumentEntity;
import com.blockout.config.legal.persistence.LegalDocumentPersistenceMapper;
import com.blockout.config.legal.persistence.LegalDocumentRepository;
import com.blockout.config.utils.DiffUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LegalDocumentService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LegalDocumentService.class);

    private final LegalDocumentRepository repository;
    private final LegalDocumentPersistenceMapper mapper;

    @Transactional(readOnly = true)
    public LegalDocumentSnapshot getByType(String type) {
        return repository.findByType(type)
                .map(mapper::toSnapshot)
                .orElseThrow(() -> notFound(type));
    }

    @Transactional
    public LegalDocumentSnapshot update(String type, UpdateLegalDocumentCommand command) {
        String normalizedType = type.toLowerCase().trim();
        return repository.findByType(normalizedType)
                .map(existing -> update(existing, command))
                .orElseThrow(() -> notFound(type));
    }

    private LegalDocumentSnapshot update(LegalDocumentEntity existing, UpdateLegalDocumentCommand command) {
        LegalDocumentEntity before = existing.toBuilder().build();
        mapper.apply(command, existing);
        LegalDocumentEntity updated = repository.save(existing);
        DiffUtils.logChanges(before, updated, LOGGER, "update_legal_document", updated.getId());
        return mapper.toSnapshot(updated);
    }

    private LegalDocumentNotFoundException notFound(String type) {
        LOGGER.warn("Legal document not found", keyValue("type", type));
        return new LegalDocumentNotFoundException(type);
    }
}
