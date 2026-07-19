package com.blockout.config.legaldocument.infrastructure.persistence.repositories;

import com.blockout.config.legaldocument.infrastructure.persistence.entities.LegalDocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Persists legal documents. */
public interface LegalDocumentRepository extends JpaRepository<LegalDocumentEntity, Long> {

    /** Finds one document by its stable type. */
    Optional<LegalDocumentEntity> findByType(String type);
}
