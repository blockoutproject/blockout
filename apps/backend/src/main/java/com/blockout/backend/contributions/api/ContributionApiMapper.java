package com.blockout.backend.contributions.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.domain.ContributionEligibility.Status;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.StreamAddress;
import com.blockout.backend.generated.mobile.model.ModeratedStreamContributionResponse;
import com.blockout.backend.generated.mobile.model.OwnStreamContributionResponse;
import com.blockout.backend.generated.mobile.model.OwnStreamContributionsResponse;
import com.blockout.backend.generated.mobile.model.StreamContributionStateEnum;
import com.blockout.backend.generated.mobile.model.StreamDecisionEnum;
import com.blockout.backend.generated.mobile.model.StreamDecisionResponse;
import com.blockout.backend.generated.mobile.model.StreamPlatformEnum;
import com.blockout.backend.generated.mobile.model.StreamQuotaResponse;
import com.blockout.backend.generated.mobile.model.StreamSubmissionEligibilityResponse;
import com.blockout.backend.shared.mapping.TemporalMapping;
import java.net.URI;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Mechanical transport mapping and explicit current-action/eligibility presentation. */
@Mapper(config = MappingConfiguration.class, uses = TemporalMapping.class)
public interface ContributionApiMapper {
  /**
   * Maps an acknowledged submission using the canonical private item representation.
   *
   * @param source completed submission outcome
   * @return current revision and caller-owned contribution
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "contribution", source = "version")
  com.blockout.backend.generated.mobile.model.OwnStreamContributionDetailResponse toDto(
      com.blockout.backend.contributions.application.SubmitContribution.Outcome source);

  /**
   * Maps one authorized member and its current revision.
   *
   * @param source current private detail
   * @return the canonical member response
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "contribution", source = "version")
  com.blockout.backend.generated.mobile.model.OwnStreamContributionDetailResponse toDto(
      ReadOwnContributions.Detail source);

  /**
   * Wraps a moderation result with the current permitted attribution.
   *
   * @param source acknowledged result
   * @param authorName current visible attribution or null
   * @return revision and authorized moderation presentation
   */
  default com.blockout.backend.generated.mobile.model.ModeratedStreamContributionDetailResponse
      toDto(
          com.blockout.backend.contributions.application.SubmitContribution.Outcome source,
          String authorName) {
    return new com.blockout.backend.generated.mobile.model
        .ModeratedStreamContributionDetailResponse(
        source.revision(), toDto(source.version(), authorName));
  }

  /**
   * Maps only a caller-owned version; no foreign history or private reports cross this boundary.
   *
   * @param version already authorized caller-owned version
   * @return canonical private version projection
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "url", source = "address")
  @Mapping(target = "platform", source = "address")
  @Mapping(target = "submittedAt", source = "createdAt")
  @Mapping(
      target = "canCancel",
      expression = "java(version.state() == ContributionVersion.State.PENDING)")
  @Mapping(
      target = "canWithdraw",
      expression = "java(version.state() == ContributionVersion.State.ACTIVE)")
  OwnStreamContributionResponse toDto(ContributionVersion version);

  /**
   * Maps the exact domain literal without URI equivalence or provider lookup.
   *
   * @param address locally recognized address
   * @return URI retaining the same serialized literal
   */
  default URI address(StreamAddress address) {
    return URI.create(address.value());
  }

  /**
   * Reads the already recognized platform without treating the address value as a bean.
   *
   * @param source locally validated stream address
   * @return the platform's canonical representation
   */
  default StreamPlatformEnum toDto(StreamAddress source) {
    return platform(source.platform());
  }

  /**
   * Maps current domain lifecycle to its canonical wire owner.
   *
   * @param state owned lifecycle
   * @return exact canonical enum
   */
  StreamContributionStateEnum state(ContributionVersion.State state);

  /**
   * Maps the recognized local platform to its canonical wire owner.
   *
   * @param platform locally recognized platform
   * @return exact canonical enum
   */
  StreamPlatformEnum platform(StreamAddress.Platform platform);

  /**
   * Composes current private eligibility, ordinary usage, exact proposal count and the bounded
   * version page.
   *
   * @param page one coherent authorized application snapshot
   * @return private context with optional next page and known eligibility deadline
   */
  default OwnStreamContributionsResponse toDto(ReadOwnContributions.Page page) {
    boolean allowed = page.eligibility() == Status.ACTIVE || page.eligibility() == Status.PENDING;
    StreamSubmissionEligibilityResponse eligibility =
        new StreamSubmissionEligibilityResponse(allowed, page.requiresApproval());
    if (!allowed) eligibility.reason(reason(page.eligibility()));
    if (page.eligibleAt() != null)
      eligibility.eligibleAt(TemporalMapping.toDate(page.eligibleAt()));
    StreamQuotaResponse quota =
        new StreamQuotaResponse(
            Math.toIntExact(page.usage().versionsUsed()),
            Math.toIntExact(page.usage().dailyMatchesUsed()),
            page.usage().matchCountedToday(),
            TemporalMapping.toDate(page.dayEndsAt()));
    OwnStreamContributionsResponse response =
        new OwnStreamContributionsResponse(
            page.revision(),
            eligibility,
            quota,
            page.proposalCount(),
            page.versions().items().stream().map(this::toDto).toList());
    if (page.versions().hasNext()) response.nextPage(page.page() + 1);
    return response;
  }

  /**
   * Presents a completed direct-publication result, including a recognized pending repetition.
   *
   * @param version current version returned by the completed command
   * @param authorName current permitted attribution, absent after erasure
   * @return private response whose actions match the actual version state
   */
  default ModeratedStreamContributionResponse toDto(
      ContributionVersion version, String authorName) {
    OwnStreamContributionResponse own = toDto(version);
    boolean pending = version.state() == ContributionVersion.State.PENDING;
    List<StreamDecisionResponse> decisions =
        version.publication() == null
            ? List.of()
            : List.of(
                new StreamDecisionResponse(
                        StreamDecisionEnum.PUBLISH,
                        TemporalMapping.toDate(version.publication().at()))
                    .actorName(authorName));
    return new ModeratedStreamContributionResponse(
            version.id(),
            own.getUrl(),
            own.getPlatform(),
            own.getState(),
            own.getSubmittedAt(),
            0L,
            pending,
            pending,
            version.state() == ContributionVersion.State.ACTIVE,
            false,
            decisions)
        .authorName(authorName);
  }

  /**
   * Returns bounded French policy feedback without rejected values or private ownership details.
   *
   * @param status current refusal outcome
   * @return safe French explanation
   */
  default String reason(Status status) {
    return switch (status) {
      case ACCOUNT_AGE_UNKNOWN -> "L’ancienneté du compte est indisponible. Réessayez.";
      case ACCOUNT_TOO_YOUNG -> "Le compte doit avoir au moins sept jours.";
      case START_UNCONFIRMED -> "L’heure du match doit être confirmée.";
      case WINDOW_NOT_OPEN -> "La publication ouvre une heure avant le match.";
      case VERSION_LIMIT -> "La limite de trois versions pour ce match est atteinte.";
      case DAILY_MATCH_LIMIT -> "La limite de trois matchs pour cette journée est atteinte.";
      case PROFESSIONAL_MATCH ->
          "Les contributions ne sont pas disponibles pour ce match professionnel.";
      default -> "La contribution n’est pas autorisée dans la situation actuelle.";
    };
  }
}
