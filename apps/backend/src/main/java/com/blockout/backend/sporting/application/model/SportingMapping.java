package com.blockout.backend.sporting.application.model;

import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Administrative catalogue reads using current acquisition settings. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SportingMapping {
  /** Aggregate coverage of the catalogue children, or of the pack itself when childless. */
  public enum MappingStatus {
    ALL,
    SOME,
    NONE
  }

  public enum MappingFilterDimension {
    SOURCE,
    SEASON
  }

  public record MappingPackFilters(
      String search, MappingStatus status, UUID sourceId, UUID seasonId) {}

  public record MappingPack(
      UUID id,
      String label,
      UUID sourceId,
      String sourceLabel,
      UUID seasonId,
      String seasonLabel,
      SportingClassification defaultClassification,
      String defaultDivisionName,
      MappingStatus status,
      int poolCount) {}

  /** Inheritance still applies when both the effective value and the pack default are absent. */
  public record MappingPool(
      UUID id,
      String label,
      SportingClassification effectiveClassification,
      String effectiveDivisionName,
      boolean inherited) {}

  public record PackMappingPage(List<MappingPack> items, long page, boolean hasNext) {
    public PackMappingPage {
      items = List.copyOf(items);
    }
  }

  public record PackMappingDetail(
      MappingPack pack, List<MappingPool> items, long page, boolean hasNext) {
    public PackMappingDetail {
      items = List.copyOf(items);
    }
  }

  public record MappingFilterOption(UUID id, String label) {}

  public record MappingFilterOptions(List<MappingFilterOption> items, long page, boolean hasNext) {
    public MappingFilterOptions {
      items = List.copyOf(items);
    }
  }
}
