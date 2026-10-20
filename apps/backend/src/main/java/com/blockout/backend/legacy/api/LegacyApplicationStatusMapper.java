package com.blockout.backend.legacy.api;

import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.legacymobile.model.LegacyApplicationStatusResponse;
import com.blockout.backend.legacy.infrastructure.LegacyRetirementProperties;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.openapitools.jackson.nullable.JsonNullable;

/** Projects fixed retirement inputs into the generated historical wire shape. */
@Mapper(config = MappingConfiguration.class, imports = JsonNullable.class)
public interface LegacyApplicationStatusMapper {
  /**
   * Keeps the installed client's update action available and its unused required fields explicit
   * null.
   *
   * @param properties complete, validated retirement inputs
   * @return the legacy representation, with no V2 access decision or optional custom message
   */
  @Mapping(target = "maintenance", constant = "false")
  @Mapping(target = "message", expression = "java(JsonNullable.of(null))")
  @Mapping(target = "imageUrl", expression = "java(JsonNullable.of(null))")
  @Mapping(target = "lastUpdate", expression = "java(JsonNullable.of(null))")
  @Mapping(target = "forceUpdateMessage", ignore = true)
  @Mapping(target = "additionalProperties", ignore = true)
  LegacyApplicationStatusResponse toDto(LegacyRetirementProperties properties);

  /**
   * Wraps a configured string through the generator's native nullable representation.
   *
   * @param value configured version or store URL
   * @return a present value for the historical nullable property
   */
  default JsonNullable<String> nullableText(String value) {
    return JsonNullable.of(value);
  }
}
