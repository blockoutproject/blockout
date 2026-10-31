package com.blockout.backend.sporting.api;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.MatchDocumentKindEnum;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import com.blockout.backend.sporting.application.ReadMatchCalendar;
import com.blockout.backend.sporting.application.ReadMatchDocument;
import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.exception.MatchDocumentUnavailableException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;

/**
 * Real generated routes, security and safe binary/error mappings; application/PDF results are
 * controlled.
 */
@WebMvcTest(ConsultationController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  ConsultationApiMapperImpl.class,
  SportingExceptionHandler.class,
  ApiExceptionHandler.class
})
@DisplayName("Match PDF HTTP boundary")
class MatchDocumentsWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000259");
  @Autowired private MockMvc mvc;
  @MockitoBean private ReadSportingResources resources;
  @MockitoBean private ReadMatchCalendar calendars;
  @MockitoBean private ReadMatchDocument documents;
  @MockitoBean private MaintenanceAdmission admission;

  @ParameterizedTest
  @EnumSource(MatchDocumentKindEnum.class)
  @DisplayName("Serves each canonical document as uncached PDF bytes to a guest")
  void servesPdf(MatchDocumentKindEnum kind) throws Exception {
    // Given
    byte[] pdf = "%PDF-1.7\nsynthetic\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    when(documents.read(ID, kind)).thenReturn(pdf);

    // When
    ResultActions response =
        mvc.perform(get("/matches/{id}/documents/{kind}", ID, kind.getValue()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(content().contentType("application/pdf"))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().bytes(pdf));
  }

  @Test
  @DisplayName("Keeps ineligible references distinct from safe supplier unavailability")
  void distinguishesFailures() throws Exception {
    // Given
    when(documents.read(ID, MatchDocumentKindEnum.INFORMATION))
        .thenThrow(new SportingResourceNotFoundException());
    when(documents.read(ID, MatchDocumentKindEnum.SCORESHEET))
        .thenThrow(new MatchDocumentUnavailableException());

    // When
    ResultActions absent =
        mvc.perform(
            get("/matches/{id}/documents/information", ID)
                .param("url", "https://arbitrary.example.invalid/private.pdf"));
    ResultActions failed = mvc.perform(get("/matches/{id}/documents/scoresheet", ID));

    // Then
    absent
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:not-found"));
    failed
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @ParameterizedTest
  @org.junit.jupiter.params.provider.ValueSource(strings = {"INFORMATION", "arbitrary"})
  @DisplayName("Rejects invalid document kinds before application dispatch")
  void rejectsUnknownKind(String kind) throws Exception {
    // Given: only the canonical closed vocabulary is accepted.

    // When
    ResultActions response = mvc.perform(get("/matches/{id}/documents/{kind}", ID, kind));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(documents);
  }

  @Test
  @DisplayName("Applies current maintenance admission before PDF access")
  void appliesCurrentAdmission() throws Exception {
    // Given
    doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE))
        .when(admission)
        .requireOrdinaryAccess(null, null, false);

    // When
    ResultActions response = mvc.perform(get("/matches/{id}/documents/information", ID));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(documents);
  }
}
