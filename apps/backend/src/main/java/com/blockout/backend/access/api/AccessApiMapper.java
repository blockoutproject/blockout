package com.blockout.backend.access.api;

import com.blockout.backend.access.application.ReadAccessConfiguration.Snapshot;
import com.blockout.backend.access.application.UpdateAccessSettings.MaintenanceChange;
import com.blockout.backend.access.application.UpdateAccessSettings.PlatformChange;
import com.blockout.backend.access.application.UpdateAccessSettings.VersionChange;
import com.blockout.backend.access.domain.ApplicationVersionSettings;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.ApplicationAccessResponse;
import com.blockout.backend.generated.mobile.model.ApplicationVersionsResponse;
import com.blockout.backend.generated.mobile.model.ChangeApplicationVersionsRequest;
import com.blockout.backend.generated.mobile.model.ChangeMaintenanceRequest;
import com.blockout.backend.generated.mobile.model.ChangePlatformVersionRequest;
import com.blockout.backend.generated.mobile.model.MaintenanceSettingsResponse;
import com.blockout.backend.generated.mobile.model.PlatformVersionResponse;
import com.blockout.backend.generated.mobile.model.PublicMaintenanceResponse;
import java.net.URI;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Maps the sole generated transport boundary, retaining nullable presence and public visibility.
 */
@Mapper(
    config = MappingConfiguration.class,
    imports = {JsonNullable.class, URI.class})
public interface AccessApiMapper {
  /**
   * Maps a complete private maintenance group, including explicit null media.
   *
   * @param source complete valid stored maintenance
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "imageUrl",
      expression =
          "java(JsonNullable.of(source.imageUrl() == null ? null : URI.create(source.imageUrl())))")
  MaintenanceSettingsResponse toDto(MaintenanceSettings source);

  /**
   * Maps both complete platforms and the present nullable shared message.
   *
   * @param source complete valid versions group
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "message", expression = "java(JsonNullable.of(source.message()))")
  ApplicationVersionsResponse toDto(ApplicationVersionSettings source);

  /**
   * Maps the nullable minimum and store URL without erasing required null fields.
   *
   * @param source complete platform settings
   */
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(target = "minimumVersion", expression = "java(JsonNullable.of(source.minimumVersion()))")
  @Mapping(
      target = "storeUrl",
      expression =
          "java(JsonNullable.of(source.storeUrl() == null ? null : URI.create(source.storeUrl())))")
  PlatformVersionResponse toDto(ApplicationVersionSettings.Platform source);

  /**
   * Publishes only active maintenance content from a complete coherent database snapshot.
   *
   * @param source both groups from one statement snapshot
   */
  default ApplicationAccessResponse toDto(Snapshot source) {
    MaintenanceSettings maintenance = source.maintenance();
    return new ApplicationAccessResponse(
        new PublicMaintenanceResponse(
            maintenance.revision(),
            maintenance.active(),
            maintenance.active() ? maintenance.message() : null,
            maintenance.active() && maintenance.imageUrl() != null
                ? URI.create(maintenance.imageUrl())
                : null),
        toDto(source.versions()));
  }

  /**
   * Preserves content-only PATCH intent; missing message never means clear.
   *
   * @param source generated content request after shape validation
   */
  default MaintenanceChange toCommand(ChangeMaintenanceRequest source) {
    return new MaintenanceChange(
        source.getRevision(), source.getMessage(), text(source.getImageUrl()));
  }

  /**
   * Preserves nested platform omission and nullable shared update text.
   *
   * @param source generated versions request after shape validation
   */
  default VersionChange toCommand(ChangeApplicationVersionsRequest source) {
    return new VersionChange(
        source.getRevision(),
        toCommand(source.getIos()),
        toCommand(source.getAndroid()),
        source.getMessage());
  }

  /**
   * Preserves an omitted platform independently from an explicitly cleared optional property.
   *
   * @param source optional generated nested platform request
   */
  default PlatformChange toCommand(ChangePlatformVersionRequest source) {
    return source == null
        ? null
        : new PlatformChange(source.getMinimumVersion(), text(source.getStoreUrl()));
  }

  /**
   * Converts a generated nullable URI without collapsing explicit null into absence.
   *
   * @param value generated URI presence, including a present null
   */
  default JsonNullable<String> text(JsonNullable<URI> value) {
    return value.isPresent()
        ? JsonNullable.of(value.get() == null ? null : value.get().toString())
        : JsonNullable.undefined();
  }
}
