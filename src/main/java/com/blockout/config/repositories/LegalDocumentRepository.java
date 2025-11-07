package com.blockout.config.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.blockout.config.models.entity.LegalDocument;

import java.util.Optional;

public interface LegalDocumentRepository extends JpaRepository<LegalDocument, Long> {
    Optional<LegalDocument> findByType(String type);
}