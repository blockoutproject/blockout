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
import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/** Mechanical transport mapping and explicit current-action/eligibility presentation. */
@Mapper(config = MappingConfiguration.class)
public interface ContributionApiMapper {
  /**
   * Maps only a caller-owned version; no foreign history or private reports cross this boundary.
   *
   * @param version already authorized caller-owned version
   * @return canonical private version projection
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "url", source = "address")
  @Mapping(target = "platform", expression = "java(platform(version.address().platform()))")
  @Mapping(target = "submittedAt", source = "createdAt")
  @Mapping(
      target = "canCancel",
      expression = "java(version.state() == ContributionVersion.State.PENDING)")
  @Mapping(
      target = "canWithdraw",
      expression = "java(version.state() == ContributionVersion.State.ACTIVE)")
  OwnStreamContributionResponse own(ContributionVersion version);

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
   * Maps current domain lifecycle to its canonical wire owner.
   *
   * @param state owned lifecycle
   * @return exact canonical enum
   */
  default StreamContributionStateEnum state(ContributionVersion.State state) {
    return StreamContributionStateEnum.valueOf(state.name());
  }

  /**
   * Maps the recognized local platform to its canonical wire owner.
   *
   * @param platform locally recognized platform
   * @return exact canonical enum
   */
  default StreamPlatformEnum platform(StreamAddress.Platform platform) {
    return StreamPlatformEnum.valueOf(platform.name());
  }

  /**
   * Preserves the UTC instant without choosing a user's display time zone.
   *
   * @param instant original instant, possibly absent
   * @return UTC representation, or null for absence
   */
  default OffsetDateTime instant(Instant instant) {
    return instant == null ? null : instant.atOffset(ZoneOffset.UTC);
  }

  /**
   * Composes current private eligibility, ordinary usage and the bounded version page.
   *
   * @param page one coherent authorized application snapshot
   * @return private context with optional next page and known eligibility deadline
   */
  default OwnStreamContributionsResponse page(ReadOwnContributions.Page page) {
    boolean allowed = page.eligibility() == Status.ACTIVE || page.eligibility() == Status.PENDING;
    StreamSubmissionEligibilityResponse eligibility =
        new StreamSubmissionEligibilityResponse(allowed, page.requiresApproval());
    if (!allowed) eligibility.reason(reason(page.eligibility()));
    if (page.eligibleAt() != null) eligibility.eligibleAt(instant(page.eligibleAt()));
    StreamQuotaResponse quota =
        new StreamQuotaResponse(
            (int) page.usage().versionsUsed(),
            (int) page.usage().dailyMatchesUsed(),
            page.usage().matchCountedToday(),
            instant(page.dayEndsAt()));
    OwnStreamContributionsResponse response =
        new OwnStreamContributionsResponse(
            page.revision(),
            eligibility,
            quota,
            page.versions().items().stream().map(this::own).toList());
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
  default ModeratedStreamContributionResponse moderated(
      ContributionVersion version, String authorName) {
    OwnStreamContributionResponse own = own(version);
    boolean pending = version.state() == ContributionVersion.State.PENDING;
    List<StreamDecisionResponse> decisions =
        version.publication() == null
            ? List.of()
            : List.of(
                new StreamDecisionResponse(
                        StreamDecisionEnum.PUBLISH, instant(version.publication().at()))
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
