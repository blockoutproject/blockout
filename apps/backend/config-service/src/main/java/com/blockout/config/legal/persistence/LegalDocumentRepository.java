package com.blockout.config.legal.persistence;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LegalDocumentRepository extends JpaRepository<LegalDocumentEntity, Long> {

    Optional<LegalDocumentEntity> findByType(String type);
}
