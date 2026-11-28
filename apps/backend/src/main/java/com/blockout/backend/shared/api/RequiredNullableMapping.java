package com.blockout.backend.shared.api;

import com.blockout.backend.shared.mapping.TemporalMapping;
import com.blockout.backend.shared.mapping.UriMapping;
import java.net.URI;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;

/** Wraps required nullable response values; never unwraps or defaults partial requests. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class RequiredNullableMapping {
  /**
   * Keeps required text present even when unknown.
   *
   * @param source optional text
   * @return present text or explicit null
   */
  public static JsonNullable<String> text(String source) {
    return JsonNullable.of(source);
  }

  /**
   * Keeps a required URI present without normalizing its literal.
   *
   * @param source URI literal or null
   * @return present URI or explicit null
   */
  public static JsonNullable<URI> uri(String source) {
    return JsonNullable.of(UriMapping.toUri(source));
  }

  /**
   * Keeps a required timestamp present in UTC without inventing an instant.
   *
   * @param source known instant or null
   * @return present UTC timestamp or explicit null
   */
  public static JsonNullable<OffsetDateTime> date(Instant source) {
    return JsonNullable.of(TemporalMapping.toDate(source));
  }

  /**
   * Keeps required identity presence independent of whether it is known.
   *
   * @param source known identifier or null
   * @return present identifier or explicit null
   */
  public static JsonNullable<UUID> id(UUID source) {
    return JsonNullable.of(source);
  }

  /**
   * Distinguishes an absent required value from a supplied empty collection.
   *
   * @param source ordered values or null
   * @return present values, including an empty list, or explicit null
   */
  public static JsonNullable<List<String>> stringList(List<String> source) {
    return JsonNullable.of(source);
  }
}
