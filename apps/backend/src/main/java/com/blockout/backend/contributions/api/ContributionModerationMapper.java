package com.blockout.backend.contributions.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.contributions.application.ModerationStore;
import com.blockout.backend.contributions.application.ReadModeration;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionDetailResponse;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.StreamModerationCountsResponse;
import com.blockout.backend.generated.mobile.model.StreamModerationItemResponse;
import com.blockout.backend.generated.mobile.model.StreamModerationMatchResponse;
import com.blockout.backend.generated.mobile.model.StreamModerationResponse;
import com.blockout.backend.generated.mobile.model.StreamReportResponse;
import com.blockout.backend.generated.mobile.model.StreamReportsResponse;
import com.blockout.backend.shared.api.RequiredNullableMapping;
import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.sporting.api.ConsultationApiMapper;
import com.blockout.backend.sporting.application.ReadPrivateMatches;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Private moderation transport composition using existing contribution and F03 primitive mappers.
 */
@Mapper(
    config = MappingConfiguration.class,
    uses = {
      ContributionApiMapper.class,
      ConsultationApiMapper.class,
      RequiredNullableMapping.class,
      TemporalMapping.class
    })
public interface ContributionModerationMapper {
  /**
   * Maps retained private context through the existing F03 primitives, without a dated public
   * wrapper.
   *
   * @param source retained authorized private context
   * @return canonical context, including a genuinely absent schedule
   */
  @Mapping(target = "additionalProperties", ignore = true)
  StreamModerationMatchResponse toDto(ReadPrivateMatches.Context source);

  /**
   * Maps current SQL badges independently of loaded pages.
   *
   * @param source current aggregate facts
   * @return canonical counts without page-derived totals
   */
  @Mapping(target = "additionalProperties", ignore = true)
  StreamModerationCountsResponse toDto(ModerationStore.Counts source);

  /**
   * Maps one queue root and its SQL activity without exposing a stored counter.
   *
   * @param source authorized distinct match and activity
   * @return canonical queue member
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "counts", source = "activity.counts")
  @Mapping(target = "approvalRequiredAfterReports", source = "activity.hold")
  @Mapping(target = "lastActivityAt", source = "activity.lastActivityAt")
  StreamModerationItemResponse toDto(ReadModeration.Item source);

  /**
   * Maps the authorized native queue page and its optional continuation.
   *
   * @param source authorized queue and canonical seasons
   * @return canonical bounded queue
   */
  @Mapping(target = "additionalProperties", ignore = true)
  StreamModerationResponse toDto(ReadModeration.Queue source);

  /**
   * Maps one internally coherent private context, independent active member and version page.
   *
   * @param source one current private match snapshot
   * @return canonical detail collection
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "counts", source = "activity.counts")
  @Mapping(target = "approvalRequiredAfterReports", source = "activity.hold")
  ModeratedStreamContributionsResponse toDto(ReadModeration.Match source);

  /**
   * Maps an exact authorized member and its current revision.
   *
   * @param source exact authorized or acknowledged member
   * @return canonical member response
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ModeratedStreamContributionDetailResponse toDto(ReadModeration.Detail source);

  /**
   * Preserves required null for an erased reason while excluding reporter identity by construction.
   *
   * @param source one retained counted fact with nullable reason
   * @return canonical report without reporter attribution
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "reason",
      source = "reason",
      nullValueCheckStrategy = org.mapstruct.NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  StreamReportResponse toDto(ModerationStore.Report source);

  /**
   * Maps the SQL total and the bounded report page.
   *
   * @param source authorized exact-version report facts
   * @return canonical report page
   */
  @Mapping(target = "additionalProperties", ignore = true)
  StreamReportsResponse toDto(ReadModeration.Reports source);
}
