package com.blockout.backend.sporting.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.ClubDetailResponse;
import com.blockout.backend.generated.mobile.model.ClubTeamsResponse;
import com.blockout.backend.generated.mobile.model.MatchCalendarResponse;
import com.blockout.backend.generated.mobile.model.MatchDayResponse;
import com.blockout.backend.generated.mobile.model.MatchDetailResponse;
import com.blockout.backend.generated.mobile.model.MatchDocumentResponse;
import com.blockout.backend.generated.mobile.model.MatchPoolGroupResponse;
import com.blockout.backend.generated.mobile.model.MatchResultResponse;
import com.blockout.backend.generated.mobile.model.MatchScheduleResponse;
import com.blockout.backend.generated.mobile.model.MatchSetScoreResponse;
import com.blockout.backend.generated.mobile.model.MatchSetsResponse;
import com.blockout.backend.generated.mobile.model.MatchSummaryResponse;
import com.blockout.backend.generated.mobile.model.MunicipalityLocationResponse;
import com.blockout.backend.generated.mobile.model.PoolDetailResponse;
import com.blockout.backend.generated.mobile.model.PoolParticipantResponse;
import com.blockout.backend.generated.mobile.model.PoolParticipantsResponse;
import com.blockout.backend.generated.mobile.model.PoolStandingsResponse;
import com.blockout.backend.generated.mobile.model.PoolSummaryResponse;
import com.blockout.backend.generated.mobile.model.SportingClassificationResponse;
import com.blockout.backend.generated.mobile.model.SportingContactsResponse;
import com.blockout.backend.generated.mobile.model.SportingDivisionResponse;
import com.blockout.backend.generated.mobile.model.SportingIdentityResponse;
import com.blockout.backend.generated.mobile.model.SportingSeasonResponse;
import com.blockout.backend.generated.mobile.model.StandingRowResponse;
import com.blockout.backend.generated.mobile.model.TeamDetailResponse;
import com.blockout.backend.generated.mobile.model.TeamSummaryResponse;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.domain.MatchFacts.SetScore;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Maps detached permitted public views to canonical generated DTOs without consulting source data.
 */
@Mapper(config = MappingConfiguration.class)
public interface ConsultationApiMapper {
  /**
   * Maps the public identity without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingIdentityResponse toResponse(ConsultationViews.Identity source);

  /**
   * Maps the public division without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "gradient",
      source = "gradient",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  SportingDivisionResponse toResponse(ConsultationViews.Division source);

  /**
   * Maps the public classification without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingClassificationResponse toResponse(ConsultationViews.Classification source);

  /**
   * Maps the public contacts without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingContactsResponse toResponse(ConsultationViews.Contacts source);

  /**
   * Maps the public location without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MunicipalityLocationResponse toResponse(ConsultationViews.Location source);

  /**
   * Maps the public clubDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ClubDetailResponse toResponse(ConsultationViews.ClubDetail source);

  /**
   * Maps the public poolSummary without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolSummaryResponse toResponse(ConsultationViews.PoolSummary source);

  /**
   * Maps the public teamSummary without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  TeamSummaryResponse toResponse(ConsultationViews.TeamSummary source);

  /**
   * Maps the public clubTeams without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ClubTeamsResponse toResponse(ConsultationViews.ClubTeams source);

  /**
   * Maps the public teamDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  TeamDetailResponse toResponse(ConsultationViews.TeamDetail source);

  /**
   * Maps the public poolDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolDetailResponse toResponse(ConsultationViews.PoolDetail source);

  /**
   * Maps the public standingRow without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  StandingRowResponse toResponse(ConsultationViews.StandingRow source);

  /**
   * Maps the public standings without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolStandingsResponse toResponse(ConsultationViews.Standings source);

  /**
   * Maps the public participant without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolParticipantResponse toResponse(ConsultationViews.Participant source);

  /**
   * Maps the public participants without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolParticipantsResponse toResponse(ConsultationViews.Participants source);

  /**
   * Maps the public schedule without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "_localDate", ignore = true)
  MatchScheduleResponse toResponse(ConsultationViews.Schedule source);

  /**
   * Maps the public result without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchResultResponse toResponse(ConsultationViews.Result source);

  /**
   * Maps the public sets without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchSetsResponse toResponse(ConsultationViews.Sets source);

  /**
   * Maps the public matchSummary without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchSummaryResponse toResponse(ConsultationViews.MatchSummary source);

  /**
   * Maps the public poolGroup without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchPoolGroupResponse toResponse(ConsultationViews.PoolGroup source);

  /**
   * Maps the public day without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchDayResponse toResponse(ConsultationViews.Day source);

  /**
   * Maps the public calendar without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchCalendarResponse toResponse(ConsultationViews.Calendar source);

  /**
   * Maps the public document without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchDocumentResponse toResponse(ConsultationViews.Document source);

  /**
   * Maps the public matchDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "streamUrl", source = "stream.url")
  @Mapping(target = "streamContributionId", source = "stream.contributionId")
  MatchDetailResponse toResponse(ConsultationViews.MatchDetail source);

  /**
   * Maps the existing canonical season identity, without a new season model.
   *
   * @param source canonical owner season
   * @return generated public season
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingSeasonResponse toResponse(SeasonView source);

  /**
   * Maps accepted set points without calculating totals or winners.
   *
   * @param source official played-set points
   * @return generated point pair
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchSetScoreResponse toResponse(SetScore source);

  /**
   * Keeps a required null gradient present rather than omitting the field.
   *
   * @param source complete configured gradient, or null for color-derived treatment
   * @return present nullable generated field
   */
  default JsonNullable<List<String>> nullableGradient(List<String> source) {
    return JsonNullable.of(source);
  }
}
