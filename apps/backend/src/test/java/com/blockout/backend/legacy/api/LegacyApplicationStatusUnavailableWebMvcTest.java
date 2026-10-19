package com.blockout.backend.legacy.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Uses real binding, mapping and security with no configured retirement inputs. */
@WebMvcTest(controllers = LegacyApplicationStatusController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  LegacyApplicationStatusMapperImpl.class
})
@DisplayName("Unconfigured legacy retirement")
class LegacyApplicationStatusUnavailableWebMvcTest {
  @Autowired private MockMvc mvc;

  @Test
  @DisplayName("Returns canonical unavailable without permissive retirement defaults")
  void refusesUnconfiguredRetirement() throws Exception {
    // Given
    String path = "/api/v1/mobile/public/config/app-status";

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.status").value(503))
        .andExpect(jsonPath("$.min_version_ios").doesNotExist());
  }
}
