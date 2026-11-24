package com.blockout.backend.search.infrastructure;

import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Owned environment namespace and resource alias names shared by reads and publication.
 *
 * @param prefix validated environment namespace, without a trailing resource suffix
 */
@Validated
@ConfigurationProperties("blockout.search.indexes")
public record SearchIndexProperties(
    @NotBlank @Pattern(regexp = "[a-z0-9][a-z0-9_-]*") String prefix) {
  /**
   * Resolves the alias of a searchable sporting kind; matches have no search index.
   *
   * @param kind current projection's sporting kind
   * @return environment-scoped alias, shared by generation, incremental writes and queries
   * @throws IllegalArgumentException when the kind has no search projection
   */
  public String alias(Kind kind) {
    return prefix
        + switch (kind) {
          case CLUB -> "-clubs";
          case TEAM -> "-teams";
          case POOL -> "-pools";
          case MATCH -> throw new IllegalArgumentException("Matches have no search index");
        };
  }
}
