package com.blockout.collector.acquisition.application;

import com.blockout.collector.config.MappingConfiguration;
import com.blockout.collector.generated.ingestion.model.CollectionStageEnum;
import com.blockout.collector.generated.ingestion.model.CollectionTargetKindEnum;
import org.mapstruct.Mapper;

/** Converts the contract-owned target purpose to its corresponding operational stage. */
@Mapper(config = MappingConfiguration.class)
public interface CollectionStageMapper {
  /**
   * Maps each qualified target without passing through its serialized spelling.
   *
   * @param source admitted target purpose, or null
   * @return corresponding stage, preserving absence
   */
  CollectionStageEnum toStage(CollectionTargetKindEnum source);
}
