package com.blockout.backend.collection.operations;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.net.URI;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** Explicit one-action operator inputs, bound by Spring without an independent CLI parser. */
@ConfigurationProperties(prefix = "blockout.reconstruction", ignoreUnknownFields = false)
@Validated
public record InitialReconstructionProperties(
    @NotNull UUID operator,
    @NotNull Action action,
    @Min(0) @Max(9007199254740990L) Long startYear,
    CollectionProviderEnum provider,
    String organizerReference,
    URI candidateUrl,
    UUID seasonId,
    @Min(0) @Max(9007199254740991L) Long revision,
    @Size(max = 200) Set<UUID> sources,
    @Size(min = 1, max = 200) Set<UUID> scopes,
    UUID sourceId,
    String label,
    @DefaultValue("0") @Min(0) int page,
    @DefaultValue("200") @Min(1) @Max(200) int size) {
  /**
   * Detaches supplied selections; absent optional scopes select the supplied complete roots.
   *
   * @param operator explicitly supplied current account
   * @param action single ordinary operation
   * @param startYear explicit sporting start year for preparation
   * @param provider source authority for preparation
   * @param organizerReference native root identity, never a guessed year
   * @param candidateUrl official candidate awaiting ordinary qualification
   * @param seasonId canonical season for request/report/closure
   * @param revision current preparation or source revision
   * @param sources exact request roots
   * @param scopes optional narrower failed scopes
   * @param sourceId exact candidate for seasonal confirmation
   * @param label exact canonical confirmation label
   * @param page zero-based report page
   * @param size bounded report page size
   */
  public InitialReconstructionProperties {
    sources = sources == null ? Set.of() : Set.copyOf(sources);
    scopes = scopes == null ? null : Set.copyOf(scopes);
  }

  /**
   * Supported owner operations; none performs a provider read or schedules a reconstruction loop.
   */
  public enum Action {
    PREPARE,
    CONFIRM,
    REQUEST,
    REPORT,
    CLOSE
  }

  /**
   * Rejects incomplete action shapes before any owner service runs.
   *
   * @return whether all inputs required by the explicitly selected action are supplied
   */
  @AssertTrue(message = "Required reconstruction inputs are missing")
  public boolean isActionComplete() {
    if (action == null) return true;
    return switch (action) {
      case PREPARE ->
          startYear != null
              && provider != null
              && organizerReference != null
              && !organizerReference.isBlank()
              && candidateUrl != null;
      case CONFIRM -> sourceId != null && revision != null && label != null;
      case REQUEST -> seasonId != null && revision != null && !sources.isEmpty();
      case REPORT -> seasonId != null;
      case CLOSE -> seasonId != null && revision != null && label != null;
    };
  }
}
