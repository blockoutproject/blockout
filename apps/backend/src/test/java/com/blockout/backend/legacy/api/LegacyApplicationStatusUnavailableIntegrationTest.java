package com.blockout.backend.legacy.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.testsupport.PostgresTestConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Proves missing retirement configuration remains a safe 503 during real SQL maintenance. */
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Unconfigured legacy retirement during F12 maintenance")
@Import(PostgresTestConfiguration.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class LegacyApplicationStatusUnavailableIntegrationTest {
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate sql;

  @Test
  @DisplayName("Returns unavailable without exposing maintenance as a legacy retirement response")
  void refusesMissingRetirementDuringMaintenance() throws Exception {
    // Given
    sql.update(
        "UPDATE access_settings SET active=true, message='Pause en cours' WHERE id='maintenance'");
    mvc.perform(get("/application-access"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.maintenance.active").value(true));

    // When
    ResultActions legacy =
        mvc.perform(
            get("/api/v1/mobile/public/config/app-status")
                .header("Authorization", "Bearer obsolete-v1"));

    // Then
    legacy
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.status").value(503))
        .andExpect(jsonPath("$.maintenance").doesNotExist())
        .andExpect(jsonPath("$.min_version_ios").doesNotExist())
        .andExpect(jsonPath("$.min_version_android").doesNotExist());
    mvc.perform(get("/clubs"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:maintenance"));
  }
}
