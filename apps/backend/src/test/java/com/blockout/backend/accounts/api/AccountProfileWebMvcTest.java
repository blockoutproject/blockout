package com.blockout.backend.accounts.api;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.application.MaintenanceAdmission;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.EstablishAccount;
import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.ReadAccount;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.shared.http.ApiExceptionHandler;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockPart;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Generated multipart binding with real security, JSON policy and controlled persistence/admission.
 */
@WebMvcTest(AccountsController.class)
@Import({
  SecurityConfiguration.class,
  HttpConfiguration.class,
  ApiExceptionHandler.class,
  AccountExceptionHandler.class,
  ReadAccount.class,
  AccountApiMapperImpl.class,
  AccountRequest.class,
  com.blockout.backend.accounts.application.ChangeAccountProfile.class,
  com.blockout.backend.accounts.infrastructure.ProfilePhotoProcessor.class
})
@DisplayName("Atomic profile HTTP input")
class AccountProfileWebMvcTest {
  private static final String ISSUER = "https://identity.example.invalid/";
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000173");
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountStore store;
  @MockitoBean private EstablishAccount establishment;
  @MockitoBean private CurrentPermissions permissions;
  @MockitoBean private MaintenanceAdmission admission;

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{}",
        "{\"username\":null}",
        "{\"photoAction\":null}",
        "{\"email\":\"private@example.invalid\"}",
        "{\"username\":\"ab\"}",
        "{\"username\":\"not allowed\"}",
        "{\"photoAction\":\"replace\"}",
        "{\"photoAction\":\"invalid\"}",
        "{\"username\":123}"
      })
  @DisplayName("Rejects invalid or empty metadata without effects")
  void rejectsMetadata(String metadata) throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request = patch(metadata);

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isBadRequest())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-request"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"{\"username\":\"Original\"}", "{\"photoAction\":\"remove\"}"})
  @DisplayName("Rejects an image without explicit replacement intent")
  void rejectsUnexpectedImage(String metadata) throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request =
        patch(metadata).part(part("image", "photo.png", "image/png", new byte[] {1}));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
  }

  @ParameterizedTest
  @ValueSource(strings = {"  Original  ", "\u00a0Original\ufeff"})
  @DisplayName("Trims an unchanged valid username before saving")
  void acceptsTrimmedCurrentUsername(String username) throws Exception {
    // Given
    Account original =
        new Account(ID, ISSUER, "auth0|one", "Original", "shared@example.invalid", null);
    when(store.lockById(ID)).thenReturn(Optional.of(original));
    when(store.findById(ID)).thenReturn(Optional.of(original));
    when(permissions.forAccount(ID)).thenReturn(Set.of());

    // When
    ResultActions response = mvc.perform(patch("{\"username\":\"" + username + "\"}"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "multipart/form-data"))
        .andExpect(jsonPath("$.username").value("Original"));
  }

  @Test
  @DisplayName("Requires JSON metadata before an account mutation")
  void requiresMetadata() throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request = multipart(HttpMethod.PATCH, "/accounts/" + ID);
    request.with(principal());

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(store);
  }

  @ParameterizedTest
  @ValueSource(strings = {"image/gif", "application/octet-stream"})
  @DisplayName("Refuses unsupported photo media without account effects")
  void refusesMedia(String mediaType) throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request =
        patch("{\"photoAction\":\"replace\"}")
            .part(part("image", "photo.gif", mediaType, new byte[] {1}));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(header().string("Cache-Control", "no-store"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Refuses oversized photo parts before applying a username")
  void refusesOversizedPhoto() throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request =
        patch("{\"username\":\"New_name\",\"photoAction\":\"replace\"}")
            .part(part("image", "photo.png", "image/png", new byte[5 * 1024 * 1024 + 1]));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isContentTooLarge())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:payload-too-large"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Rejects invalid decoded content before applying a username")
  void refusesInvalidPhoto() throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request =
        patch("{\"username\":\"New_name\",\"photoAction\":\"replace\"}")
            .part(part("image", "photo.png", "image/png", new byte[] {1, 2, 3}));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:invalid-image"));
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Exposes only the canonical username collision after whole-save refusal")
  void translatesCollision() throws Exception {
    // Given
    Account original =
        new Account(ID, ISSUER, "auth0|one", "Original", "shared@example.invalid", null);
    when(store.lockById(ID)).thenReturn(Optional.of(original));
    doThrow(new UsernameUnavailableException()).when(store).changeProfile(ID, "Taken", null, null);

    // When
    ResultActions response = mvc.perform(patch("{\"username\":\"Taken\"}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:username-unavailable"))
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  @ParameterizedTest
  @ValueSource(strings = {"unknown", "metadata"})
  @DisplayName("Rejects unknown or repeated multipart parts")
  void refusesExtraPart(String name) throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request =
        patch("{\"username\":\"Original\"}")
            .part(part(name, null, "application/json", "{}".getBytes(StandardCharsets.UTF_8)));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Rejects repeated replacement images")
  void refusesRepeatedImages() throws Exception {
    // Given
    MockMultipartHttpServletRequestBuilder request =
        patch("{\"photoAction\":\"replace\"}")
            .part(
                part("image", "one.png", "image/png", new byte[] {1}),
                part("image", "two.png", "image/png", new byte[] {2}));

    // When
    ResultActions response = mvc.perform(request);

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(store);
  }

  @Test
  @DisplayName("Reads private binary photos without JSON serialization")
  void readsBinary() throws Exception {
    // Given
    Account original =
        new Account(ID, ISSUER, "auth0|one", "Original", "shared@example.invalid", null);
    byte[] bytes = new byte[] {1, 2, 3};
    when(store.findById(ID)).thenReturn(Optional.of(original));
    when(store.photo(ID)).thenReturn(Optional.of(new ProfilePhoto(bytes, "image/png", 1)));

    // When
    ResultActions response = mvc.perform(get("/accounts/" + ID + "/photo").with(principal()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(content().contentType("image/png"))
        .andExpect(content().bytes(bytes));
  }

  @Test
  @DisplayName("Hides another owner's photo and mutations")
  void hidesAnotherOwner() throws Exception {
    // Given
    Account other = new Account(ID, ISSUER, "auth0|other", "Other", "shared@example.invalid", null);
    when(store.lockById(ID)).thenReturn(Optional.of(other));
    when(store.findById(ID)).thenReturn(Optional.of(other));

    // When
    ResultActions profileResponse = mvc.perform(patch("{\"username\":\"Original\"}"));
    ResultActions photoResponse = mvc.perform(get("/accounts/" + ID + "/photo").with(principal()));

    // Then
    profileResponse.andExpect(status().isNotFound());
    photoResponse.andExpect(status().isNotFound());
    verify(store, never()).photo(ID);
  }

  @Test
  @DisplayName("Returns 404 for an owner whose photo is absent")
  void refusesMissingPhoto() throws Exception {
    // Given
    when(store.findById(ID))
        .thenReturn(
            Optional.of(
                new Account(ID, ISSUER, "auth0|one", "Original", "shared@example.invalid", null)));

    // When
    ResultActions response = mvc.perform(get("/accounts/" + ID + "/photo").with(principal()));

    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  /** Supplies only synthetic validated credentials; the signature suite owns JWT trust. */
  private static RequestPostProcessor principal() {
    return jwt()
        .jwt(token -> token.issuer(ISSUER).subject("auth0|one").claim("azp", "mobile-test"))
        .authorities(new SimpleGrantedAuthority("SCOPE_openid"));
  }

  /**
   * Constructs a servlet part with the same headers supplied by Expo Fetch.
   *
   * @param name canonical multipart field, or the scenario's deliberately unknown name
   * @param filename file name for binary parts, or null for JSON metadata
   * @param contentType declared part media type
   * @param bytes synthetic part content
   * @return a servlet part retaining its actual content and media declaration
   */
  private static MockPart part(String name, String filename, String contentType, byte[] bytes) {
    MockPart part = new MockPart(name, filename, bytes);
    part.getHeaders().setContentType(MediaType.parseMediaType(contentType));
    return part;
  }

  /**
   * Creates a real JSON part and synthetic validated JWT; no production credential is used.
   *
   * @param metadata scenario-owned JSON change document
   * @return owner-authorized multipart PATCH to the original account
   */
  private static MockMultipartHttpServletRequestBuilder patch(String metadata) {
    MockMultipartHttpServletRequestBuilder request = multipart(HttpMethod.PATCH, "/accounts/" + ID);
    request.part(
        part("metadata", null, "application/json", metadata.getBytes(StandardCharsets.UTF_8)));
    request.with(principal());
    return request;
  }
}
