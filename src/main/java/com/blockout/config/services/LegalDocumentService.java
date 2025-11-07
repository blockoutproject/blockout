package com.blockout.config.services;

import com.blockout.config.exceptions.LegalDocumentNotFoundException;
import com.blockout.config.models.dto.LegalDocumentUpdateDTO;
import com.blockout.config.models.entity.LegalDocument;
import com.blockout.config.repositories.LegalDocumentRepository;
import com.blockout.config.utils.DiffUtils;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class LegalDocumentService {

    private static final Logger logger = LoggerFactory.getLogger(LegalDocumentService.class);
    private final LegalDocumentRepository repository;

    /**
     * Récupère un document légal à partir de son type (terms, privacy, imprint)
     */
    public LegalDocument getByType(String type) {
        return repository.findByType(type)
                .orElseThrow(() -> {
                    logger.warn("Legal document not found", keyValue("type", type));
                    return new LegalDocumentNotFoundException(type);
                });
    }

    /**
     * Met à jour un document légal existant à partir de son type
     */
    public LegalDocument updateLegalDocument(String type, LegalDocumentUpdateDTO dto) {
        return repository.findByType(type.toLowerCase().trim())
                .map(existing -> {
                    LegalDocument before = existing.toBuilder().build();

                    if (dto.getTitle() != null)
                        existing.setTitle(dto.getTitle());

                    if (dto.getVersion() != null)
                        existing.setVersion(dto.getVersion());

                    if (dto.getContent() != null)
                        existing.setContent(dto.getContent());

                    LegalDocument updated = repository.save(existing);
                    DiffUtils.logChanges(before, updated, logger, "update_legal_document", updated.getId());
                    return updated;
                })
                .orElseThrow(() -> {
                    logger.warn("Legal document not found", keyValue("type", type));
                    return new LegalDocumentNotFoundException(type);
                });
    }
}