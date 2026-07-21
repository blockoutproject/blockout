package com.blockout.config;

import com.blockout.config.appstatus.api.models.AppStatusInternalResponse;
import com.blockout.config.division.api.models.DivisionInternalResponse;
import com.blockout.config.legaldocument.api.models.LegalDocumentInternalResponse;
import com.blockout.config.rawdivisionmapping.api.models.RawDivisionMappingInternalResponse;
import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;
import com.blockout.config.scraperstatus.api.models.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.models.ScraperName;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Protects the complete native-camelCase configuration response models.
 */
@DisplayName("Configuration API contract")
class ConfigApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
        .findAndRegisterModules()
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    /**
     * Verifies the exact authoritative field set and enum values for every configuration resource.
     */
    @Test
    @DisplayName("serializes every authoritative configuration response in native camelCase")
    void serializesAuthoritativeConfigurationResponses() {
        LocalDateTime timestamp = LocalDateTime.of(2026, 7, 19, 12, 30);

        assertFields(new AppStatusInternalResponse(false, "ready", null, "1.0", "1.0", null, null, null,
                Instant.parse("2026-07-19T10:30:00Z")),
            "maintenance", "message", "imageUrl", "minVersionIos", "minVersionAndroid", "storeUrlIos",
            "storeUrlAndroid", "forceUpdateMessage", "lastUpdate");
        assertFields(new DivisionInternalResponse(1L, "National", "#1", "#2", "#3", "#4", null, true,
                timestamp, timestamp),
            "id", "name", "mainColor", "firstGradientColor", "secondGradientColor", "thirdGradientColor",
            "logoUrl", "active", "createdAt", "lastUpdate");
        assertFields(new LegalDocumentInternalResponse(1L, "terms", "Terms", "1", "content", timestamp, timestamp),
            "id", "type", "title", "version", "content", "createdAt", "lastUpdate");
        assertFields(new RawDivisionMappingInternalResponse(1L, "N3", 4L, Format.SIX, Gender.F, "LNV", "2026",
                timestamp, timestamp, true),
            "id", "rawDivisionName", "divisionId", "format", "gender", "leagueCode", "season", "createdAt",
            "lastUpdate", "mapped");
        assertFields(new ScraperStatusInternalResponse(1L, ScraperName.SCRAPER_CLUBS, true, timestamp),
            "id", "name", "enabled", "lastUpdate");
    }

    /**
     * Serializes one response and verifies its complete top-level field set.
     */
    private void assertFields(Object response, String... fields) {
        JsonNode json = objectMapper.valueToTree(response);
        assertThat(json.fieldNames()).toIterable().containsExactly(fields);
        assertThat(json.fieldNames()).toIterable().allMatch(name -> !name.contains("_"));
    }
}
