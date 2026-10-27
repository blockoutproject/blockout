package com.blockout.backend.collection.infrastructure.persistence;

import com.blockout.backend.collection.application.model.InitialCoverage;
import com.blockout.backend.config.MappingConfiguration;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

/** Mechanical report mapping inside the collection persistence boundary. */
@Mapper(config = MappingConfiguration.class)
interface InitialCoveragePersistenceMapper {
  /**
   * Detaches one current row inside the owner transaction.
   *
   * @param entity persisted evidence
   * @return immutable operator/F14 view
   */
  InitialCoverage toView(InitialCoverageEntity entity);

  /**
   * Constructs a new requested-evidence row.
   *
   * @param view application-owned evidence
   * @return new persistence state, with no implicit save
   */
  InitialCoverageEntity toEntity(InitialCoverage view);

  /**
   * Replaces exactly one locked report key, including unknown counts.
   *
   * @param view newer or explicitly renewed evidence
   * @param entity existing report row
   */
  void update(InitialCoverage view, @MappingTarget InitialCoverageEntity entity);
}
