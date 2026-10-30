package com.blockout.backend.contributions.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.contributions.application.ContributionStore;
import com.blockout.backend.contributions.application.ReadOwnContributions;
import com.blockout.backend.contributions.domain.ContributionEligibility;
import com.blockout.backend.contributions.domain.ContributionQuota;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;

/** Keeps quota conversion exact and proposal totals independent of the loaded version page. */
@DisplayName("Contribution response conversion")
class ContributionApiMapperTest {
  @ParameterizedTest
  @CsvSource({"2147483648, 1", "1, 2147483648"})
  @DisplayName("Rejects an unrepresentable usage count instead of publishing a negative quota")
  void rejectsUsageOverflow(long versions, long matches) {
    // Given
    ContributionApiMapper mapper = Mappers.getMapper(ContributionApiMapper.class);
    ReadOwnContributions.Page page =
        new ReadOwnContributions.Page(
            "7",
            ContributionEligibility.Status.VERSION_LIMIT,
            false,
            null,
            new ContributionQuota.Usage(versions, matches, false),
            Instant.parse("2026-10-26T23:00:00Z"),
            0,
            null,
            new ContributionStore.VersionPage(List.of(), false),
            0);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable convert = () -> mapper.toDto(page);

    // Then
    assertThatThrownBy(convert).isInstanceOf(ArithmeticException.class);
  }

  @ParameterizedTest
  @ValueSource(longs = {0, 21, 9007199254740991L})
  @DisplayName("Maps the exact proposal count without deriving it from the loaded page")
  void preservesProposalTotal(long count) {
    // Given
    ContributionApiMapper mapper = Mappers.getMapper(ContributionApiMapper.class);
    ReadOwnContributions.Page page =
        new ReadOwnContributions.Page(
            "7",
            ContributionEligibility.Status.ACTIVE,
            false,
            null,
            new ContributionQuota.Usage(0, 0, false),
            Instant.parse("2026-10-26T23:00:00Z"),
            count,
            null,
            new ContributionStore.VersionPage(List.of(), false),
            0);

    // When
    com.blockout.backend.generated.mobile.model.OwnStreamContributionsResponse response =
        mapper.toDto(page);

    // Then
    assertThat(response.getProposalCount()).isEqualTo(count);
    assertThat(response.getItems()).isEmpty();
    assertThat(response.getActiveContribution()).isNull();
    assertThat(response.getQuota().getVersionsUsed()).isZero();
  }

  @org.junit.jupiter.api.Test
  @DisplayName(
      "Repeated moderator publication preserves the original approval actor rather than naming the owner")
  void preservesOriginalApprovalActor() {
    // Given
    java.util.UUID owner = java.util.UUID.fromString("00000000-0000-4000-8000-000000000001");
    java.util.UUID moderator = java.util.UUID.fromString("00000000-0000-4000-8000-000000000002");
    com.blockout.backend.contributions.domain.ContributionVersion version =
        new com.blockout.backend.contributions.domain.ContributionVersion(
            java.util.UUID.randomUUID(),
            java.util.UUID.randomUUID(),
            new com.blockout.backend.contributions.domain.StreamAddress(
                "https://youtu.be/approved"),
            owner,
            com.blockout.backend.contributions.domain.ContributionVersion.State.ACTIVE,
            java.time.Instant.parse("2026-10-24T12:00:00Z"),
            true,
            null,
            null,
            new com.blockout.backend.contributions.domain.ContributionVersion.Decision(
                com.blockout.backend.contributions.domain.ContributionVersion.DecisionKind.APPROVAL,
                java.time.Instant.parse("2026-10-24T12:01:00Z"),
                moderator),
            null);
    ContributionApiMapper mapper = Mappers.getMapper(ContributionApiMapper.class);

    // When
    com.blockout.backend.generated.mobile.model.ModeratedStreamContributionDetailResponse response =
        mapper.toDto(
            new com.blockout.backend.contributions.application.SubmitContribution.Outcome(
                version, "2", false),
            java.util.Map.of(owner, "Owner", moderator, "Moderator"),
            3L);

    // Then
    assertThat(response.getContribution().getAuthorName()).isEqualTo("Owner");
    assertThat(response.getContribution().getDecisions())
        .singleElement()
        .satisfies(
            decision -> {
              assertThat(decision.getKind())
                  .isEqualTo(
                      com.blockout.backend.generated.mobile.model.StreamDecisionEnum.APPROVE);
              assertThat(decision.getActorName()).isEqualTo("Moderator");
            });
  }
}
