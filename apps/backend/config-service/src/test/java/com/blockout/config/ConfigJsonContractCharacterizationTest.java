package com.blockout.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.config.models.entities.ScraperStatus;
import com.blockout.config.models.enums.ScraperName;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ConfigJsonContractCharacterizationTest {

    @Test
    void serializesScraperStatusWithTheCurrentSnakeCaseContract() throws Exception {
        try (InputStream stream = getClass().getResourceAsStream("/application.yaml")) {
            assertThat(stream).isNotNull();
            String applicationYaml = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(applicationYaml).contains("property-naming-strategy: SNAKE_CASE");
        }

        ObjectMapper objectMapper = new ObjectMapper()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
                .findAndRegisterModules()
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        ScraperStatus status = ScraperStatus.builder()
                .id(1L)
                .name(ScraperName.SCRAPER_CLUBS)
                .enabled(true)
                .lastUpdate(LocalDateTime.of(2026, 7, 19, 12, 30))
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(status));

        assertThat(json.path("last_update").asText()).isEqualTo("2026-07-19T12:30:00");
        assertThat(json.has("lastUpdate")).isFalse();
    }
}
