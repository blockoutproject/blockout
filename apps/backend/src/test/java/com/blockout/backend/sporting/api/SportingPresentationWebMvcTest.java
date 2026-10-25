package com.blockout.backend.sporting.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.model.SportingPresentation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.service.ChangeClubContacts;
import com.blockout.backend.sporting.application.service.ChangeSportingPresentation;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
import com.blockout.backend.sporting.support.SportingImageFixture;
import java.nio.charset.StandardCharsets;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Generated presentation binding with real metadata/content validation and controlled use cases.
 */
@WebMvcTest(SportingPresentationController.class)
@Import({
  SportingPresentationValidator.class,
  com.blockout.backend.sporting.application.service.ValidateSportingImage.class,
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  SportingAdministrationMapperImpl.class,
  SportingPresentationMapperImpl.class,
  SportingObservationMapperImpl.class,
  SportingExceptionHandler.class
})
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
@DisplayName("Sporting presentation HTTP boundary")
class SportingPresentationWebMvcTest {
  @MockitoBean private CurrentPermissions permissions;
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000193");
  private static final UUID RESOURCE = UUID.fromString("00000000-0000-4000-8000-000000000194");
  @Autowired private MockMvc mvc;
  @MockitoBean private AccountAccess accounts;
  @MockitoBean private ChangeSportingPresentation presentation;
  @MockitoBean private ReadSportingConfiguration configurationReads;
  @MockitoBean private ChangeClubContacts contacts;

  @Test
  @DisplayName("Accepts complete names-only pool replacement with independent explicit nulls")
  void replacesPoolNames() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(presentation.set(eq(ACCOUNT), eq(Kind.POOL), eq(RESOURCE), any()))
        .thenReturn(view(Kind.POOL));

    // When
    mvc.perform(
            put("/administration/pools/{id}/presentation", RESOURCE)
                .with(operator())
                .contentType("application/json")
                .content("{\"revision\":\"0\",\"manualName\":null,\"manualShortName\":\"Short\"}"))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.names.effectiveShortName").value("Short"));

    // Then
    ArgumentCaptor<SportingPresentation.Edit> command =
        ArgumentCaptor.forClass(SportingPresentation.Edit.class);
    verify(presentation).set(eq(ACCOUNT), eq(Kind.POOL), eq(RESOURCE), command.capture());
    assertThat(command.getValue().manualName()).isNull();
    assertThat(command.getValue().manualShortName()).isEqualTo("Short");
    assertThat(command.getValue().logoAction()).isNull();
  }

  @ParameterizedTest
  @ValueSource(strings = {"clubs", "teams", "pools"})
  @DisplayName("Reads each current presentation through its canonical generated shape")
  void readsPresentation(String path) throws Exception {
    // Given
    Kind kind = path.equals("clubs") ? Kind.CLUB : path.equals("teams") ? Kind.TEAM : Kind.POOL;
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.presentation(ACCOUNT, kind, RESOURCE)).thenReturn(view(kind));

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/" + path + "/{id}/presentation", RESOURCE).with(operator()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.names.manualName").value(nullValue()));
  }

  @ParameterizedTest
  @CsvSource({"clubs,PNG", "teams,JPEG", "divisions,PNG"})
  @DisplayName(
      "Binds multipart PATCH nulls and detects actual image content before the atomic save")
  void bindsMultipartPatch(String path, String format) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(presentation.set(any(), any(), any(), any()))
        .thenReturn(view(path.equals("clubs") ? Kind.CLUB : Kind.TEAM));
    when(presentation.setDivision(any(), any(), any()))
        .thenReturn(new DivisionDetail(RESOURCE, 1, "Division", "#112233", null, true, false));
    byte[] bytes = SportingImageFixture.image(format, 0x112233);

    // When
    mvc.perform(
            multipart(HttpMethod.PATCH, "/administration/" + path + "/{id}/presentation", RESOURCE)
                .file(metadata(path, "replace"))
                .file(
                    new MockMultipartFile(
                        "image", "misleading.bin", "application/octet-stream", bytes))
                .with(operator()))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"));

    // Then
    if (path.equals("divisions")) {
      ArgumentCaptor<SportingPresentation.DivisionEdit> command =
          ArgumentCaptor.forClass(SportingPresentation.DivisionEdit.class);
      verify(presentation).setDivision(eq(ACCOUNT), eq(RESOURCE), command.capture());
      assertThat(command.getValue().gradient()).isNull();
      assertThat(command.getValue().image().bytes()).isEqualTo(bytes);
    } else {
      ArgumentCaptor<SportingPresentation.Edit> command =
          ArgumentCaptor.forClass(SportingPresentation.Edit.class);
      verify(presentation).set(eq(ACCOUNT), any(), eq(RESOURCE), command.capture());
      assertThat(command.getValue().manualName()).isNull();
      assertThat(command.getValue().image().bytes()).isEqualTo(bytes);
      assertThat(command.getValue().image().mediaType())
          .isEqualTo(format.equals("PNG") ? "image/png" : "image/jpeg");
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"keep", "automatic"})
  @DisplayName("Rejects unexpected image parts without saving names or artwork")
  void rejectsUnexpectedImage(String action) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));

    // When
    ResultActions response =
        mvc.perform(
            multipart(HttpMethod.PATCH, "/administration/clubs/{id}/presentation", RESOURCE)
                .file(metadata("clubs", action))
                .file(new MockMultipartFile("image", new byte[] {1}))
                .with(operator()));

    // Then
    response.andExpect(status().isUnprocessableEntity());
    verify(presentation, never()).set(any(), any(), any(), any());
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1, 5_242_881})
  @DisplayName("Refuses absent, invalid or oversized replacement before any part of the save")
  void rejectsInvalidReplacement(int size) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));

    // When
    ResultActions response =
        mvc.perform(
            multipart(HttpMethod.PATCH, "/administration/teams/{id}/presentation", RESOURCE)
                .file(metadata("teams", "replace"))
                .file(new MockMultipartFile("image", new byte[size]))
                .with(operator()));

    // Then
    response.andExpect(status().is(size > 5_242_880 ? 413 : 422));
    verify(presentation, never()).set(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Requires a replacement part when replace is selected")
  void requiresImage() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));

    // When
    ResultActions response =
        mvc.perform(
            multipart(HttpMethod.PATCH, "/administration/clubs/{id}/presentation", RESOURCE)
                .file(metadata("clubs", "replace"))
                .with(operator()));

    // Then
    response.andExpect(status().isUnprocessableEntity());
    verify(presentation, never()).set(any(), any(), any(), any());
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":\"0\",\"manualName\":null}",
        "{\"revision\":\"0\",\"manualName\":null,\"manualShortName\":null,\"logoAction\":\"keep\"}",
        "{\"revision\":\"0\",\"manualName\":null,\"manualShortName\":null,\"image\":\"bad\"}"
      })
  @DisplayName("Rejects incomplete or non-name pool state through the generated strict request")
  void rejectsInvalidPoolState(String body) throws Exception {
    // Given
    // Required presence and unknown properties are owned by generated binding.

    // When
    ResultActions response =
        mvc.perform(
            put("/administration/pools/{id}/presentation", RESOURCE)
                .with(operator())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
    verify(presentation, never()).set(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Maps only supplied contact modes while returning explicit nulls")
  void mapsIndependentContacts() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(contacts.correct(eq(ACCOUNT), eq(RESOURCE), eq("0"), any())).thenReturn(contactState());
    when(configurationReads.clubContacts(ACCOUNT, RESOURCE)).thenReturn(contactState());

    // When
    mvc.perform(
            patch("/administration/clubs/{id}/contacts", RESOURCE)
                .with(operator())
                .contentType("application/json")
                .content(
                    "{\"revision\":\"0\",\"email\":{\"mode\":\"hidden\"},\"phone\":{\"mode\":\"manual\",\"value\":\"0123456789\"}}"))
        .andExpect(status().isOk())
        .andExpect(header().string("Accept-Patch", "application/json"))
        .andExpect(jsonPath("$.email.effectiveValue").value(nullValue()));
    mvc.perform(get("/administration/clubs/{id}/contacts", RESOURCE).with(operator()))
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"));

    // Then
    @SuppressWarnings("unchecked")
    ArgumentCaptor<Map<ContactField, SportingPresentation.ContactEdit>> changes =
        ArgumentCaptor.forClass(Map.class);
    verify(contacts).correct(eq(ACCOUNT), eq(RESOURCE), eq("0"), changes.capture());
    assertThat(changes.getValue()).containsOnlyKeys(ContactField.EMAIL, ContactField.PHONE);
    assertThat(changes.getValue().get(ContactField.EMAIL).mode()).isEqualTo(ContactModeEnum.HIDDEN);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "{\"revision\":\"0\",\"email\":null}",
        "{\"revision\":\"0\",\"email\":{\"mode\":\"source\",\"extra\":true}}"
      })
  @DisplayName("Rejects null field objects and strict nested contact properties")
  void rejectsMalformedContactPatch(String body) throws Exception {
    // Given
    // Explicit absence uses hidden/source modes, never a null field object.

    // When
    ResultActions response =
        mvc.perform(
            patch("/administration/clubs/{id}/contacts", RESOURCE)
                .with(operator())
                .contentType("application/json")
                .content(body));

    // Then
    response.andExpect(status().isBadRequest());
    verify(contacts, never()).correct(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Checks the current grant before inspecting replacement content")
  void checksGrantBeforeDecoding() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    doThrow(new AccessDeniedException("Not permitted"))
        .when(permissions)
        .requireForRead(ACCOUNT, Permission.MANAGE_SPORTING_PRESENTATION);

    // When
    ResultActions response =
        mvc.perform(
            multipart(HttpMethod.PATCH, "/administration/clubs/{id}/presentation", RESOURCE)
                .file(metadata("clubs", "replace"))
                .file(new MockMultipartFile("image", new byte[] {1}))
                .with(operator()));

    // Then
    response
        .andExpect(status().isForbidden())
        .andExpect(header().string("Cache-Control", "no-store"));
    verify(presentation, never()).set(any(), any(), any(), any());
  }

  @Test
  @DisplayName("Returns the canonical stale conflict without private submitted content")
  void translatesStaleRevision() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(presentation.set(any(), any(), any(), any()))
        .thenThrow(new SportingConflictException("stale-revision", List.of()));

    // When
    ResultActions response =
        mvc.perform(
            put("/administration/pools/{id}/presentation", RESOURCE)
                .with(operator())
                .contentType("application/json")
                .content("{\"revision\":\"old\",\"manualName\":null,\"manualShortName\":null}"));

    // Then
    response
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.type").value("urn:blockout:problem:stale-revision"));
  }

  @Test
  @DisplayName("Uses a Bearer challenge for an unauthenticated editor read")
  void challengesAnonymousRead() throws Exception {
    // Given
    // No bearer credential is supplied.

    // When
    ResultActions response = mvc.perform(get("/administration/clubs/{id}/presentation", RESOURCE));

    // Then
    response
        .andExpect(status().isUnauthorized())
        .andExpect(header().string("WWW-Authenticate", org.hamcrest.Matchers.startsWith("Bearer")));
  }

  @Test
  @DisplayName("Refuses JSON-only presentation PATCH as unsupported media")
  void refusesWrongMedia() throws Exception {
    // Given
    // The accepted patch format is multipart/form-data.

    // When
    ResultActions response =
        mvc.perform(
            patch("/administration/clubs/{id}/presentation", RESOURCE)
                .with(operator())
                .contentType("application/json")
                .content("{}"));

    // Then
    response.andExpect(status().isUnsupportedMediaType());
  }

  /**
   * @return a synthetic current operator token without changing current application grants
   */
  private RequestPostProcessor operator() {
    return jwt()
        .jwt(
            token -> token.issuer("https://identity.example.invalid/").claim("azp", "mobile-test"));
  }

  /**
   * Builds complete metadata while keeping the scenario's owner/action explicit.
   *
   * @param path clubs, teams or divisions
   * @param action desired logo instruction
   * @return JSON multipart metadata with required nulls preserved
   */
  private MockMultipartFile metadata(String path, String action) {
    String fields =
        path.equals("divisions")
            ? "\"name\":\"Division\",\"color\":\"#112233\",\"gradient\":null,"
            : "\"manualName\":null," + (path.equals("teams") ? "\"manualShortName\":null," : "");
    return new MockMultipartFile(
        "metadata",
        "",
        "application/json",
        ("{\"revision\":\"0\"," + fields + "\"logoAction\":\"" + action + "\"}")
            .getBytes(StandardCharsets.UTF_8));
  }

  /**
   * Supplies the current generated-response input, independently from each command under test.
   *
   * @param kind scenario-owned resource kind
   * @return detached synthetic editor state
   */
  private SportingPresentation.View view(Kind kind) {
    return new SportingPresentation.View(
        RESOURCE,
        kind,
        "1",
        new SportingPresentation.Names(
            "Source",
            "Source",
            null,
            kind == Kind.CLUB ? null : "Short",
            kind == Kind.CLUB ? null : "Short"),
        new SportingPresentation.Logo(null, null, null));
  }

  /**
   * @return all current empty source-managed fields, retaining explicit privacy-safe nulls
   */
  private SportingPresentation.Contacts contactState() {
    Map<ContactField, ContactValue> fields = new EnumMap<>(ContactField.class);
    for (ContactField field : ContactField.values())
      fields.put(field, new ContactValue(null, null, ContactModeEnum.SOURCE, false));
    return new SportingPresentation.Contacts(RESOURCE, 1, fields, null, null, null);
  }
}
