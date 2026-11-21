package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.mobile.model.MappingStatusEnum;
import com.blockout.backend.shared.pagination.OffsetPage;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Administrative catalogue reads using current acquisition settings. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingMapping {
  public record MappingPackFilters(
      String search, MappingStatusEnum status, UUID sourceId, UUID seasonId) {}

  public record MappingPack(
      UUID id,
      String label,
      UUID sourceId,
      String sourceLabel,
      UUID seasonId,
      String seasonLabel,
      SportingClassification defaultClassification,
      String defaultDivisionName,
      MappingStatusEnum status,
      int poolCount) {}

  /** Inheritance still applies when both the effective value and the pack default are absent. */
  public record MappingPool(
      UUID id,
      String label,
      SportingClassification effectiveClassification,
      String effectiveDivisionName,
      boolean inherited) {}

  public record PackMappingDetail(MappingPack pack, OffsetPage<MappingPool> pools) {}

  public record MappingFilterOption(UUID id, String label) {}
}
