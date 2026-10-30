package com.blockout.backend.contributions.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.contributions.application.ReadModeration;
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
   * @param names current original-owner/decision names; erased lifecycles are omitted
   * @param reportCount current exact-version report facts, including anonymous rows
   * @return revision and authorized moderation presentation
   */
  default com.blockout.backend.generated.mobile.model.ModeratedStreamContributionDetailResponse
      toDto(
          com.blockout.backend.contributions.application.SubmitContribution.Outcome source,
          java.util.Map<java.util.UUID, String> names,
          long reportCount) {
    return new com.blockout.backend.generated.mobile.model
        .ModeratedStreamContributionDetailResponse(
        source.revision(),
        toDto(
            new ReadModeration.Version(
                source.version(),
                source.version().ownerId() == null ? null : names.get(source.version().ownerId()),
                source.version().publication() == null
                        || source.version().publication().actorId() == null
                    ? null
                    : names.get(source.version().publication().actorId()),
                source.version().decision() == null || source.version().decision().actorId() == null
                    ? null
                    : names.get(source.version().decision().actorId()),
                reportCount,
                true)));
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
   * Composes current private eligibility, ordinary usage, exact proposal count, independently
   * selected owned active version and the bounded version page.
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
    if (page.activeContribution() != null)
      response.activeContribution(toDto(page.activeContribution()));
    if (page.versions().hasNext()) response.nextPage(page.page() + 1);
    return response;
  }

  /**
   * Projects all useful decision facts, lineage and actions from a current private snapshot.
   *
   * @param source authorized version with current attribution/counts/publication restrictions
   * @return canonical private member without any reporter identity
   */
  default ModeratedStreamContributionResponse toDto(ReadModeration.Version source) {
    ContributionVersion version = source.version();
    boolean pending = version.state() == ContributionVersion.State.PENDING;
    java.util.ArrayList<StreamDecisionResponse> decisions = new java.util.ArrayList<>();
    if (version.publication() != null)
      decisions.add(decision(version.publication(), source.publicationActorName()));
    if (version.decision() != null)
      decisions.add(decision(version.decision(), source.decisionActorName()));
    decisions.sort(java.util.Comparator.comparing(StreamDecisionResponse::getAt));
    return new ModeratedStreamContributionResponse(
            version.id(),
            address(version.address()),
            toDto(version.address()),
            state(version.state()),
            TemporalMapping.toDate(version.createdAt()),
            source.reportCount(),
            pending && source.canPublish(),
            pending,
            version.state() == ContributionVersion.State.ACTIVE,
            source.canPublish()
                && com.blockout.backend.contributions.domain.ContributionDecision.canReactivate(
                    version.state()),
            decisions)
        .authorName(source.authorName())
        .sourceVersionId(version.sourceVersionId())
        .replacedByVersionId(version.replacedByVersionId());
  }

  /** Maps useful domain decisions without treating automatic hiding as an attributed command. */
  default StreamDecisionResponse decision(ContributionVersion.Decision source, String actorName) {
    StreamDecisionEnum kind =
        switch (source.kind()) {
          case PUBLICATION -> StreamDecisionEnum.PUBLISH;
          case APPROVAL -> StreamDecisionEnum.APPROVE;
          case REACTIVATION -> StreamDecisionEnum.REACTIVATE;
          case REJECTION -> StreamDecisionEnum.REJECT;
          case CANCELLATION -> StreamDecisionEnum.CANCEL;
          case SUPERSESSION -> StreamDecisionEnum.SUPERSEDE;
          case WITHDRAWAL -> StreamDecisionEnum.WITHDRAW;
          case HIDING -> StreamDecisionEnum.HIDE;
          case REPLACEMENT -> StreamDecisionEnum.REPLACE;
        };
    return new StreamDecisionResponse(kind, TemporalMapping.toDate(source.at()))
        .actorName(actorName);
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
