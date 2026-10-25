package com.blockout.backend.collection.application.model;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.ingestion.model.CollectionStageEnum;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.ValueMapping;

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
   * Maps a direct stage to its admitted target purpose; logo work has separate admission rules.
   *
   * @param source direct evidence stage
   * @return corresponding target purpose
   * @throws IllegalArgumentException for logo work, which is admitted through its owning calendar
   */
  @ValueMapping(source = "LOGO", target = MappingConstants.THROW_EXCEPTION)
  CollectionTargetKindEnum toTargetKind(CollectionStageEnum source);
}
