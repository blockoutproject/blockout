package com.blockout.backend.collection.application.model;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import org.mapstruct.Mapper;

/** Relates admitted target purposes to operational evidence stages without using wire strings. */
@Mapper(config = MappingConfiguration.class)
public interface CollectionStageMapper {
  /**
   * Maps an admitted target purpose to its corresponding evidence stage.
   *
   * @param source admitted read purpose
   * @return corresponding independent evidence stage
   */
  CollectionStageEnum toStage(CollectionTargetKindEnum source);

  /**
   * Maps a stage to its direct target purpose, including explicitly selected team logos.
   *
   * @param source direct evidence stage
   * @return corresponding target purpose
   */
  CollectionTargetKindEnum toTargetKind(CollectionStageEnum source);
}
