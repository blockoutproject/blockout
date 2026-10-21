package com.blockout.backend.sporting.api;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.service.ClassificationService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Real generated routes, validation and security filters; use-case effects are isolated. */
@WebMvcTest(controllers = SportingClassificationController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  SportingAdministrationMapperImpl.class,
  SportingExceptionHandler.class
})
@DisplayName("Sporting classification HTTP boundary")
class SportingClassificationWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000002");
  @Autowired private MockMvc mvc;
  @MockitoBean private ClassificationService classifications;
  @MockitoBean private AccountAccess accounts;

  @ParameterizedTest
  @ValueSource(strings = {"packs", "pools"})
  @DisplayName("Challenges visitors without invoking an administrative use case")
  void challengesVisitor(String resource) throws Exception {
    // Given
    String path = "/administration/" + resource + "/" + ID + "/classification";
    // When
    ResultActions response = mvc.perform(get(path));
    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().exists("WWW-Authenticate"))
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(classifications);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":\"0\"}",
        "{\"revision\":\"0\",\"classification\":{\"divisionId\":\"00000000-0000-4000-8000-000000000003\"}}",
        "{\"revision\":\"0\",\"classification\":null,\"active\":true}"
      })
  @DisplayName("Rejects missing, partial and unknown writable state")
  void requiresCompleteState(String body) throws Exception {
    // Given
    // A native test JWT isolates use-case validation from signature qualification.
    // When
    ResultActions response =
        mvc.perform(
            put("/administration/pools/{id}/classification", ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(classifications);
  }

  @Test
  @DisplayName(
      "Passes an explicit null through the real generated PUT and serializes both required nulls")
  void removesSetting() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(classifications.setPool(ACCOUNT, ID, "0", null))
        .thenReturn(new ClassificationView(ID, "1", null, null));
    // When
    ResultActions response =
        mvc.perform(
            put("/administration/pools/{id}/classification", ID)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"0\",\"classification\":null}"));
    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.revision").value("1"))
        .andExpect(jsonPath("$.setting").value(nullValue()))
        .andExpect(jsonPath("$.effective").value(nullValue()));
    verify(classifications).setPool(ACCOUNT, ID, "0", null);
  }

  @Test
  @DisplayName("Returns a safe complete conflict with only scoped identities")
  void exposesConflictScopes() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(classifications.setPack(eq(ACCOUNT), eq(ID), eq("0"), any()))
        .thenThrow(new SportingConflictException("classification-conflict", List.of(ID)));
    // When
    ResultActions response =
        mvc.perform(
            put("/administration/packs/{id}/classification", ID)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"revision\":\"0\",\"classification\":null}"));
    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:classification-conflict"))
        .andExpect(jsonPath("$.conflictingResourceIds[0]").value(ID.toString()));
  }

  @Test
  @DisplayName("Preserves the native permission refusal without exposing its private diagnostic")
  void refusesPermission() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(classifications.pool(ACCOUNT, ID))
        .thenThrow(new AccessDeniedException("Private diagnostic"));
    // When
    ResultActions response =
        mvc.perform(
            get("/administration/pools/{id}/classification", ID)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.detail").doesNotExist());
  }

  @Test
  @DisplayName("Rejects unsupported request media before invoking a classification command")
  void refusesUnsupportedMedia() throws Exception {
    // Given
    // The canonical replacement requires JSON.
    // When
    ResultActions response =
        mvc.perform(
            put("/administration/pools/{id}/classification", ID)
                .with(jwt().jwt(token -> token.claim("azp", "mobile-test")))
                .contentType(MediaType.TEXT_PLAIN)
                .content("invalid"));
    // Then
    response.andExpect(status().isUnsupportedMediaType());
    verifyNoInteractions(classifications);
  }

  @ParameterizedTest
  @ValueSource(strings = {"packs", "pools"})
  @DisplayName("Reads complete canonical classification values from either generated resource")
  void readsClassification(String resource) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    SportingClassification value =
        new SportingClassification(ID, SportFormatEnum._4X4, SportGenderEnum.MIXED);
    ClassificationView current = new ClassificationView(ID, "2", value, value);
    if (resource.equals("packs")) when(classifications.pack(ACCOUNT, ID)).thenReturn(current);
    else when(classifications.pool(ACCOUNT, ID)).thenReturn(current);
    // When
    ResultActions response =
        mvc.perform(
            get("/administration/" + resource + "/" + ID + "/classification")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.setting.format").value("4x4"))
        .andExpect(jsonPath("$.effective.gender").value("mixed"));
  }

  @Test
  @DisplayName("Maps a complete generated request into the canonical application classification")
  void replacesClassification() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    SportingClassification value =
        new SportingClassification(ID, SportFormatEnum._2X2, SportGenderEnum.MALE);
    when(classifications.setPool(ACCOUNT, ID, "0", value))
        .thenReturn(new ClassificationView(ID, "1", value, value));
    // When
    ResultActions response =
        mvc.perform(
            put("/administration/pools/{id}/classification", ID)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"revision\":\"0\",\"classification\":{\"divisionId\":\""
                        + ID
                        + "\",\"format\":\"2x2\",\"gender\":\"male\"}}"));
    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.effective.format").value("2x2"));
    verify(classifications).setPool(ACCOUNT, ID, "0", value);
  }
}
