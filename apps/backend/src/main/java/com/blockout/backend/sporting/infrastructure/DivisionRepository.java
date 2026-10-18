package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Native Spring Data access to the sporting division owner. */
interface DivisionRepository extends JpaRepository<DivisionEntity, UUID> {}
