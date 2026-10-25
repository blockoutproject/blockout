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
import com.blockout.backend.shared.api.RequiredNullableMapping;
import com.blockout.backend.sporting.application.ConsultationViews;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.domain.MatchFacts.SetScore;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;

/**
 * Maps detached permitted public views to canonical generated DTOs without consulting source data.
 */
@Mapper(config = MappingConfiguration.class, uses = RequiredNullableMapping.class)
public interface ConsultationApiMapper {
  /**
   * Maps the public identity without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingIdentityResponse toDto(ConsultationViews.Identity source);

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
  SportingDivisionResponse toDto(ConsultationViews.Division source);

  /**
   * Maps the public classification without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingClassificationResponse toDto(ConsultationViews.Classification source);

  /**
   * Maps the public contacts without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingContactsResponse toDto(ConsultationViews.Contacts source);

  /**
   * Maps the public location without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MunicipalityLocationResponse toDto(ConsultationViews.Location source);

  /**
   * Maps the public clubDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ClubDetailResponse toDto(ConsultationViews.ClubDetail source);

  /**
   * Maps the public poolSummary without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolSummaryResponse toDto(ConsultationViews.PoolSummary source);

  /**
   * Maps the public teamSummary without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  TeamSummaryResponse toDto(ConsultationViews.TeamSummary source);

  /**
   * Maps the public clubTeams without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  ClubTeamsResponse toDto(ConsultationViews.ClubTeams source);

  /**
   * Maps the public teamDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  TeamDetailResponse toDto(ConsultationViews.TeamDetail source);

  /**
   * Maps the public poolDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolDetailResponse toDto(ConsultationViews.PoolDetail source);

  /**
   * Maps the public standingRow without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  StandingRowResponse toDto(ConsultationViews.StandingRow source);

  /**
   * Maps the public standings without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolStandingsResponse toDto(ConsultationViews.Standings source);

  /**
   * Maps the public participant without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolParticipantResponse toDto(ConsultationViews.Participant source);

  /**
   * Maps the public participants without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  PoolParticipantsResponse toDto(ConsultationViews.Participants source);

  /**
   * Maps the public schedule without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "_localDate", ignore = true)
  MatchScheduleResponse toDto(ConsultationViews.Schedule source);

  /**
   * Maps the public result without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchResultResponse toDto(ConsultationViews.Result source);

  /**
   * Maps the public sets without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchSetsResponse toDto(ConsultationViews.Sets source);

  /**
   * Maps the public matchSummary without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchSummaryResponse toDto(ConsultationViews.MatchSummary source);

  /**
   * Maps the public poolGroup without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchPoolGroupResponse toDto(ConsultationViews.PoolGroup source);

  /**
   * Maps the public day without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchDayResponse toDto(ConsultationViews.Day source);

  /**
   * Maps the public calendar without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchCalendarResponse toDto(ConsultationViews.Calendar source);

  /**
   * Maps the public document without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchDocumentResponse toDto(ConsultationViews.Document source);

  /**
   * Maps the public matchDetail without inferred defaults or administrative fields.
   *
   * @param source current authorized immutable value, or null for an unavailable optional field
   * @return canonical generated representation, or null
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "streamUrl", source = "stream.url")
  @Mapping(target = "streamContributionId", source = "stream.contributionId")
  MatchDetailResponse toDto(ConsultationViews.MatchDetail source);

  /**
   * Maps the existing canonical season identity, without a new season model.
   *
   * @param source canonical owner season
   * @return generated public season
   */
  @Mapping(target = "additionalProperties", ignore = true)
  SportingSeasonResponse toDto(SeasonView source);

  /**
   * Maps accepted set points without calculating totals or winners.
   *
   * @param source official played-set points
   * @return generated point pair
   */
  @Mapping(target = "additionalProperties", ignore = true)
  MatchSetScoreResponse toDto(SetScore source);
}
