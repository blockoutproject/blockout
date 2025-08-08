package com.blockout.config.repositories;

import com.blockout.config.models.LegalDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LegalDocumentRepository extends JpaRepository<LegalDocument, Long> {
    Optional<LegalDocument> findByType(String type);
}