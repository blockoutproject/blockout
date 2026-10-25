package com.blockout.backend.contributions.api;

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
import org.mapstruct.factory.Mappers;

/** Protects the int32 transport boundary from silently wrapped persistent usage counts. */
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
            new ContributionStore.VersionPage(List.of(), false),
            0);

    // When
    org.assertj.core.api.ThrowableAssert.ThrowingCallable convert = () -> mapper.toDto(page);

    // Then
    assertThatThrownBy(convert).isInstanceOf(ArithmeticException.class);
  }
}
