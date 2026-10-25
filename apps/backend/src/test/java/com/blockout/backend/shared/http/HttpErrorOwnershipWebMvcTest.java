package com.blockout.backend.shared.http;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.collection.api.CollectionApiMapperImpl;
import com.blockout.backend.collection.api.CollectionResultsController;
import com.blockout.backend.collection.application.service.ReadCollectionConfiguration;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.sporting.api.SportingAdministrationMapperImpl;
import com.blockout.backend.sporting.api.SportingClassificationController;
import com.blockout.backend.sporting.application.service.ChangeSportingClassification;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.CannotCreateTransactionException;

/** Compares real generated feature routes with controlled application and current-account seams. */
@WebMvcTest({CollectionResultsController.class, SportingClassificationController.class})
@AutoConfigureMockMvc(addFilters = false)
@Import({
  HttpConfiguration.class,
  CollectionApiMapperImpl.class,
  SportingAdministrationMapperImpl.class
})
@DisplayName("Shared HTTP error ownership across feature routes")
class HttpErrorOwnershipWebMvcTest {
  private static final String RESULTS =
      "/administration/collection-controls/00000000-0000-4000-8000-000000000001/results";
  private static final String CLASSIFICATION =
      "/administration/packs/00000000-0000-4000-8000-000000000001/classification";
  @Autowired private MockMvc mvc;
  @MockitoBean private CurrentAccount account;
  @MockitoBean private ReadCollectionConfiguration collectionReads;
  @MockitoBean private ReadSportingConfiguration sportingReads;
  @MockitoBean private ChangeSportingClassification classifications;

  @ParameterizedTest
  @ValueSource(strings = {RESULTS, CLASSIFICATION})
  @DisplayName("Translates storage acquisition failures identically before application dispatch")
  void translatesStorageAcquisition(String path) throws Exception {
    // Given
    when(account.id()).thenThrow(new CannotCreateTransactionException("private database address"));

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(jsonPath("$.title").value("Service Unavailable"))
        .andExpect(jsonPath("$.status").value(503))
        .andExpect(jsonPath("$.detail").doesNotExist())
        .andExpect(jsonPath("$.instance").doesNotExist());
  }

  @ParameterizedTest
  @ValueSource(strings = {RESULTS, CLASSIFICATION})
  @DisplayName("Translates storage resource failures identically")
  void translatesStorageResourceFailure(String path) throws Exception {
    // Given
    when(account.id())
        .thenThrow(new DataAccessResourceFailureException("private database address"));

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:unavailable"))
        .andExpect(content().string(not(containsString("private"))));
  }

  @ParameterizedTest
  @ValueSource(strings = {RESULTS, CLASSIFICATION})
  @DisplayName("Keeps programming failures distinct from temporary storage outages")
  void preservesUnexpectedFailure(String path) throws Exception {
    // Given
    when(account.id()).thenThrow(new InvalidDataAccessResourceUsageException("private SQL"));

    // When
    ResultActions response = mvc.perform(get(path));

    // Then
    response
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.type").value("about:blank"))
        .andExpect(jsonPath("$.status").value(500))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().string(not(containsString("private"))));
  }

  @ParameterizedTest
  @ValueSource(strings = {RESULTS, CLASSIFICATION})
  @DisplayName("Preserves native Allow headers with the same opaque framework error profile")
  void preservesFrameworkHeaders(String path) throws Exception {
    // Given
    String unsupportedPath = path;

    // When
    ResultActions response = mvc.perform(post(unsupportedPath));

    // Then
    response
        .andExpect(status().isMethodNotAllowed())
        .andExpect(header().string("Allow", containsString("GET")))
        .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.status").value(405))
        .andExpect(jsonPath("$.detail").doesNotExist());
  }
}
