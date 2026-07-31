package com.blockout.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.appstatus.api.AppStatusController;
import com.blockout.config.contract.api.AppStatusApi;
import com.blockout.config.contract.api.DivisionApi;
import com.blockout.config.contract.api.LegalDocumentApi;
import com.blockout.config.contract.api.RawDivisionMappingApi;
import com.blockout.config.contract.api.ScraperStatusApi;
import com.blockout.config.contract.model.AppStatusInternalResponse;
import com.blockout.config.contract.model.DivisionInternalResponse;
import com.blockout.config.contract.model.LegalDocumentInternalResponse;
import com.blockout.config.contract.model.RawDivisionMappingInternalResponse;
import com.blockout.config.contract.model.ScraperStatusInternalResponse;
import com.blockout.config.division.api.DivisionController;
import com.blockout.config.legaldocument.api.LegalDocumentController;
import com.blockout.config.rawdivisionmapping.api.RawDivisionMappingController;
import com.blockout.config.scraperstatus.api.ScraperStatusController;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.shared.model.ScraperNameEnum;
import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

/** Protects the complete native-camelCase configuration response models. */
@DisplayName("Configuration API contract")
class ConfigApiContractUnitTest {

  private final ObjectMapper objectMapper =
      JsonMapper.builder()
          .findAndAddModules()
          .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
          .build();

  /**
   * Verifies the exact authoritative field set and enum values for every configuration resource.
   */
  @Test
  @DisplayName("serializes every authoritative configuration response in native camelCase")
  void serializesAuthoritativeConfigurationResponses() {
    LocalDateTime timestamp = LocalDateTime.of(2026, 7, 19, 12, 30);

    assertFields(
        new AppStatusInternalResponse(false)
            .message("ready")
            .minVersionIos("1.0")
            .minVersionAndroid("1.0")
            .lastUpdate(Instant.parse("2026-07-19T10:30:00Z")),
        "maintenance",
        "message",
        "imageUrl",
        "minVersionIos",
        "minVersionAndroid",
        "storeUrlIos",
        "storeUrlAndroid",
        "forceUpdateMessage",
        "lastUpdate");
    assertFields(
        new DivisionInternalResponse(1L, "National", "#1", "#2", "#3", "#4", true)
            .createdAt(timestamp)
            .lastUpdate(timestamp),
        "id",
        "name",
        "mainColor",
        "firstGradientColor",
        "secondGradientColor",
        "thirdGradientColor",
        "logoUrl",
        "active",
        "createdAt",
        "lastUpdate");
    assertFields(
        new LegalDocumentInternalResponse(1L, "terms", "Terms", "1", "content")
            .createdAt(timestamp)
            .lastUpdate(timestamp),
        "id",
        "type",
        "title",
        "version",
        "content",
        "createdAt",
        "lastUpdate");
    assertFields(
        new RawDivisionMappingInternalResponse(1L, "N3", "LNV", "2026", true)
            .divisionId(4L)
            .format(FormatEnum.SIX)
            .gender(GenderEnum.F)
            .createdAt(timestamp)
            .lastUpdate(timestamp),
        "id",
        "rawDivisionName",
        "divisionId",
        "format",
        "gender",
        "leagueCode",
        "season",
        "createdAt",
        "lastUpdate",
        "mapped");
    assertFields(
        new ScraperStatusInternalResponse(1L, ScraperNameEnum.SCRAPER_CLUBS, true)
            .lastUpdate(timestamp),
        "id",
        "name",
        "enabled",
        "lastUpdate");
  }

  @Test
  @DisplayName("controllers implement their generated interfaces")
  void controllersImplementGeneratedInterfaces() {
    assertThat(AppStatusApi.class).isAssignableFrom(AppStatusController.class);
    assertThat(DivisionApi.class).isAssignableFrom(DivisionController.class);
    assertThat(LegalDocumentApi.class).isAssignableFrom(LegalDocumentController.class);
    assertThat(RawDivisionMappingApi.class).isAssignableFrom(RawDivisionMappingController.class);
    assertThat(ScraperStatusApi.class).isAssignableFrom(ScraperStatusController.class);
  }

  /** Serializes one response and verifies its complete top-level field set. */
  private void assertFields(Object response, String... fields) {
    JsonNode json = objectMapper.valueToTree(response);
    assertThat(json.propertyNames()).containsExactlyInAnyOrder(fields);
    assertThat(json.propertyNames()).allMatch(name -> !name.contains("_"));
  }
}
