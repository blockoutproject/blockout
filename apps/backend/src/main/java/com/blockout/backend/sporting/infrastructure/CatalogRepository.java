package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native access to one current replacement token per source-season binding. */
interface CatalogRepository extends JpaRepository<CatalogEntity, UUID> {}
