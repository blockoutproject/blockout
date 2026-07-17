package com.blockout.config.division.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DivisionRepository extends JpaRepository<DivisionEntity, Long> {

    Optional<DivisionEntity> findByNameIgnoreCase(String name);
}
