package com.blockout.backend.sporting.api;

import static org.mockito.AdditionalMatchers.aryEq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.config.SecurityConfiguration;
import com.blockout.backend.sporting.application.DivisionService;
import com.blockout.backend.sporting.application.SportingViews.DivisionDetail;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Qualifies actual multipart metadata binding and atomic image validation before effects. */
@WebMvcTest(controllers = DivisionAdministrationController.class)
@Import({
  HttpConfiguration.class,
  SecurityConfiguration.class,
  CurrentAccount.class,
  SportingAdministrationMapperImpl.class,
  SportingExceptionHandler.class
})
@DisplayName("Division administration HTTP boundary")
class DivisionAdministrationWebMvcTest {
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID DIVISION = UUID.fromString("00000000-0000-4000-8000-000000000002");
  @Autowired private MockMvc mvc;
  @MockitoBean private DivisionService divisions;
  @MockitoBean private AccountAccess accounts;

  @Test
  @DisplayName(
      "Creates an active division with a matching Location and explicit null presentation values")
  void createsDivision() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(divisions.create(eq(ACCOUNT), eq("National 2"), eq("#112233"), any(), any(), any()))
        .thenReturn(new DivisionDetail(DIVISION, 0L, "National 2", "#112233", null, false, true));
    // When
    ResultActions response =
        mvc.perform(
            multipart("/administration/divisions")
                .file(metadata("keep"))
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/administration/divisions/" + DIVISION))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.active").value(true))
        .andExpect(jsonPath("$.gradient").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.logo.effectiveUrl").value(org.hamcrest.Matchers.nullValue()));
  }

  @Test
  @DisplayName("Refuses an undecodable replacement before creating any division")
  void refusesInvalidImage() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    MockMultipartFile image =
        new MockMultipartFile("image", "synthetic.png", "image/png", new byte[] {1, 2, 3});
    // When
    ResultActions response =
        mvc.perform(
            multipart("/administration/divisions")
                .file(metadata("replace"))
                .file(image)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response.andExpect(status().isUnprocessableEntity());
    verify(divisions, never()).create(any(), any(), any(), any(), any(), any());
  }

  @Test
  @DisplayName("Refuses a missing lifecycle grant before inspecting invalid image content")
  void refusesUnauthorizedImageValidation() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    doThrow(new AccessDeniedException("Division lifecycle is not permitted"))
        .when(divisions)
        .requireLifecycle(ACCOUNT);
    MockMultipartFile image =
        new MockMultipartFile("image", "synthetic.png", "image/png", new byte[] {1, 2, 3});

    // When
    ResultActions response =
        mvc.perform(
            multipart("/administration/divisions")
                .file(metadata("replace"))
                .file(image)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));

    // Then
    response.andExpect(status().isForbidden());
    verify(divisions, never()).create(any(), any(), any(), any(), any(), any());
  }

  @ParameterizedTest
  @ValueSource(strings = {"PNG", "JPEG"})
  @DisplayName(
      "Accepts decodable supported bytes and derives media type independently from the upload label")
  void acceptsActualImage(String format) throws Exception {
    // Given
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), format, output);
    byte[] bytes = output.toByteArray();
    String mediaType = format.equals("PNG") ? "image/png" : "image/jpeg";
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(divisions.create(
            eq(ACCOUNT), eq("National 2"), eq("#112233"), any(), aryEq(bytes), eq(mediaType)))
        .thenReturn(new DivisionDetail(DIVISION, 0L, "National 2", "#112233", null, true, true));
    // When
    ResultActions response =
        mvc.perform(
            multipart("/administration/divisions")
                .file(metadata("replace"))
                .file(
                    new MockMultipartFile("image", "wrong.bin", "application/octet-stream", bytes))
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.logo.manualUrl").value("/divisions/" + DIVISION + "/logo"));
    verify(divisions)
        .create(eq(ACCOUNT), eq("National 2"), eq("#112233"), any(), aryEq(bytes), eq(mediaType));
  }

  @ParameterizedTest
  @ValueSource(strings = {"keep", "automatic"})
  @DisplayName("Forbids an image when the logo instruction does not replace it")
  void refusesUnexpectedImage(String action) throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    MockMultipartFile image =
        new MockMultipartFile("image", "synthetic.png", "image/png", new byte[] {1});
    // When
    ResultActions response =
        mvc.perform(
            multipart("/administration/divisions")
                .file(metadata(action))
                .file(image)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response.andExpect(status().isUnprocessableEntity());
    verify(divisions, never()).create(any(), any(), any(), any(), any(), any());
  }

  @Test
  @DisplayName("Refuses a replacement without image bytes before any write")
  void requiresReplacementImage() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    // The metadata deliberately requests a missing replacement.
    // When
    ResultActions response =
        mvc.perform(
            multipart("/administration/divisions")
                .file(metadata("replace"))
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response.andExpect(status().isUnprocessableEntity());
    verify(divisions, never()).create(any(), any(), any(), any(), any(), any());
  }

  @Test
  @DisplayName(
      "Reads the generated list and member projections without caching administrative values")
  void readsDivisions() throws Exception {
    // Given
    DivisionDetail division =
        new DivisionDetail(
            DIVISION,
            2L,
            "National 2",
            "#112233",
            List.of("#112233", "#445566", "#778899"),
            false,
            false);
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(divisions.list(ACCOUNT, true)).thenReturn(List.of(division));
    when(divisions.get(ACCOUNT, DIVISION)).thenReturn(division);
    // When
    ResultActions list =
        mvc.perform(
            get("/administration/divisions")
                .param("includeInactive", "true")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    ResultActions member =
        mvc.perform(
            get("/administration/divisions/{id}", DIVISION)
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    list.andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items[0].active").value(false));
    member
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.revision").value("2"))
        .andExpect(jsonPath("$.gradient[1]").value("#445566"));
  }

  @Test
  @DisplayName("Binds explicit false through the generated lifecycle PUT")
  void deactivatesDivision() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(divisions.setActive(ACCOUNT, DIVISION, "0", false))
        .thenReturn(new DivisionDetail(DIVISION, 1L, "National 2", "#112233", null, false, false));
    // When
    ResultActions response =
        mvc.perform(
            put("/administration/divisions/{id}/activity", DIVISION)
                .contentType("application/json")
                .content("{\"revision\":\"0\",\"active\":false}")
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
        .andExpect(jsonPath("$.active").value(false));
    verify(divisions).setActive(ACCOUNT, DIVISION, "0", false);
  }

  @Test
  @DisplayName("Requires multipart creation instead of accepting a JSON-only request")
  void requiresMultipart() throws Exception {
    // Given
    // JSON alone cannot carry the atomic editor's image part.
    // When
    ResultActions response =
        mvc.perform(
            post("/administration/divisions")
                .contentType("application/json")
                .content("{}")
                .with(
                    jwt()
                        .jwt(
                            token ->
                                token
                                    .issuer("https://identity.example.invalid/")
                                    .claim("azp", "mobile-test"))));
    // Then
    response.andExpect(status().isUnsupportedMediaType());
    verifyNoInteractions(divisions);
  }

  /**
   * Creates complete JSON metadata without hiding the scenario's logo instruction.
   *
   * @param action desired logo behavior owned by the scenario
   * @return multipart JSON metadata for a valid division name and colors
   */
  private MockMultipartFile metadata(String action) {
    return new MockMultipartFile(
        "metadata",
        "",
        "application/json",
        ("{\"name\":\"National 2\",\"color\":\"#112233\",\"gradient\":null,\"logoAction\":\""
                + action
                + "\"}")
            .getBytes(StandardCharsets.UTF_8));
  }
}
