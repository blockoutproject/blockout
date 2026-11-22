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
import com.blockout.backend.generated.mobile.model.MappingFilterDimensionEnum;
import com.blockout.backend.generated.mobile.model.MappingStatusEnum;
import com.blockout.backend.shared.pagination.OffsetPage;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingFilterOption;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPack;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPackFilters;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPool;
import com.blockout.backend.sporting.application.model.SportingMapping.PackMappingDetail;
import com.blockout.backend.sporting.application.model.SportingViews.ClassificationView;
import com.blockout.backend.sporting.application.service.ChangeSportingClassification;
import com.blockout.backend.sporting.application.service.ReadSportingConfiguration;
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
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
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
@MockitoBean(types = com.blockout.backend.access.application.MaintenanceAdmission.class)
class SportingClassificationWebMvcTest {
  private static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
  private static final UUID ACCOUNT = UUID.fromString("00000000-0000-4000-8000-000000000002");
  private static final UUID SOURCE = UUID.fromString("00000000-0000-4000-8000-000000000003");
  private static final UUID SEASON = UUID.fromString("00000000-0000-4000-8000-000000000004");
  @Autowired private MockMvc mvc;
  @MockitoBean private ChangeSportingClassification classifications;
  @MockitoBean private ReadSportingConfiguration configurationReads;
  @MockitoBean private AccountAccess accounts;

  @Test
  @DisplayName("Binds every pack filter and returns the aggregate independently of the default")
  void listsMappingPacks() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    String search = "tour ligue" + "🏐".repeat(190);
    MappingPackFilters filters =
        new MappingPackFilters(search, MappingStatusEnum.SOME, SOURCE, SEASON);
    MappingPack pack =
        new MappingPack(
            ID,
            "CFA",
            SOURCE,
            "FFVB / Ligue",
            SEASON,
            "2026–2027",
            null,
            null,
            MappingStatusEnum.SOME,
            2,
            1);
    when(configurationReads.mappingPacks(ACCOUNT, filters, 2, 1))
        .thenReturn(new OffsetPage<>(List.of(pack), 2, true));

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/packs")
                .with(mobileJwt())
                .param("search", search)
                .param("status", "some")
                .param("sourceId", SOURCE.toString())
                .param("seasonId", SEASON.toString())
                .param("page", "2")
                .param("size", "1"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.page").value(2))
        .andExpect(jsonPath("$.hasNext").value(true))
        .andExpect(jsonPath("$.items[0].sourceId").value(SOURCE.toString()))
        .andExpect(jsonPath("$.items[0].sourceLabel").value("FFVB / Ligue"))
        .andExpect(jsonPath("$.items[0].seasonId").value(SEASON.toString()))
        .andExpect(jsonPath("$.items[0].seasonLabel").value("2026–2027"))
        .andExpect(jsonPath("$.items[0].status").value("some"))
        .andExpect(jsonPath("$.items[0].poolCount").value(2))
        .andExpect(jsonPath("$.items[0].classifiedPoolCount").value(1))
        .andExpect(jsonPath("$.items[0].defaultClassification").value(nullValue()));
  }

  @Test
  @DisplayName("Reads the unfiltered first pack page with the shared defaults")
  void readsFirstMappingPage() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.mappingPacks(
            ACCOUNT, new MappingPackFilters(null, null, null, null), 0, 50))
        .thenReturn(OffsetPage.empty(0));

    // When
    ResultActions response = mvc.perform(get("/administration/packs").with(mobileJwt()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.items").isEmpty())
        .andExpect(jsonPath("$.hasNext").value(false));
  }

  @Test
  @DisplayName("Serializes a custom classification and an inherited pool without a classification")
  void readsMappingPoolModes() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    UUID customPool = UUID.fromString("00000000-0000-4000-8000-000000000005");
    UUID inheritedPool = UUID.fromString("00000000-0000-4000-8000-000000000006");
    UUID division = UUID.fromString("00000000-0000-4000-8000-000000000007");
    SportingClassification custom =
        new SportingClassification(division, SportFormatEnum._6X6, SportGenderEnum.FEMALE);
    MappingPack pack =
        new MappingPack(
            ID,
            "CFA",
            SOURCE,
            "FFVB / Ligue",
            SEASON,
            "2026–2027",
            null,
            null,
            MappingStatusEnum.SOME,
            2,
            1);
    when(configurationReads.mappingPack(ACCOUNT, ID, 0, 50))
        .thenReturn(
            new PackMappingDetail(
                pack,
                new OffsetPage<>(
                    List.of(
                        new MappingPool(customPool, "Tour 1", custom, "M18 Régionale", false),
                        new MappingPool(inheritedPool, "Tour 2", null, null, true)),
                    0,
                    false)));

    // When
    ResultActions response = mvc.perform(get("/administration/packs/{id}", ID).with(mobileJwt()));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.pack.id").value(ID.toString()))
        .andExpect(jsonPath("$.items[0].id").value(customPool.toString()))
        .andExpect(jsonPath("$.items[0].mode").value("custom"))
        .andExpect(
            jsonPath("$.items[0].effectiveClassification.divisionId").value(division.toString()))
        .andExpect(
            jsonPath("$.items[0].effectiveClassification.divisionName").value("M18 Régionale"))
        .andExpect(jsonPath("$.items[0].effectiveClassification.format").value("6x6"))
        .andExpect(jsonPath("$.items[0].effectiveClassification.gender").value("female"))
        .andExpect(jsonPath("$.items[1].id").value(inheritedPool.toString()))
        .andExpect(jsonPath("$.items[1].mode").value("inherited"))
        .andExpect(jsonPath("$.items[1].effectiveClassification").value(nullValue()));
  }

  @Test
  @DisplayName("Routes filter choices to their own bounded read under the same HTTP boundary")
  void listsMappingFilterOptions() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.mappingFilterOptions(ACCOUNT, MappingFilterDimensionEnum.SEASON, 0, 1))
        .thenReturn(
            new OffsetPage<>(List.of(new MappingFilterOption(SEASON, "2026–2027")), 0, true));

    // When
    ResultActions response =
        mvc.perform(
            get("/administration/packs/filter-options")
                .with(mobileJwt())
                .param("dimension", "season")
                .param("size", "1"));

    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.items[0].id").value(SEASON.toString()))
        .andExpect(jsonPath("$.items[0].label").value("2026–2027"))
        .andExpect(jsonPath("$.hasNext").value(true));
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/administration/packs",
        "/administration/packs/00000000-0000-4000-8000-000000000001",
        "/administration/packs/filter-options?dimension=source"
      })
  @DisplayName("Challenges visitors before reaching any mapping read")
  void challengesMappingVisitor(String path) throws Exception {
    // Given a visitor without a mobile access token.
    // When
    ResultActions response = mvc.perform(get(path));
    // Then
    response.andExpect(status().isUnauthorized()).andExpect(header().exists("WWW-Authenticate"));
    verifyNoInteractions(configurationReads);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "/administration/packs?status=SOME",
        "/administration/packs/00000000-0000-4000-8000-000000000001?size=201",
        "/administration/packs/filter-options?dimension=source&page=-1"
      })
  @DisplayName("Rejects invalid mapping criteria before reaching the catalogue")
  void refusesInvalidMappingCriteria(String path) throws Exception {
    // When
    ResultActions response = mvc.perform(get(path).with(mobileJwt()));
    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(configurationReads);
  }

  @Test
  @DisplayName("Rejects search beyond the shared Unicode code point limit")
  void refusesLongMappingSearch() throws Exception {
    // Given
    String search = "🏐".repeat(201);

    // When
    ResultActions response =
        mvc.perform(get("/administration/packs").with(mobileJwt()).queryParam("search", search));

    // Then
    response.andExpect(status().isBadRequest());
    verifyNoInteractions(configurationReads);
  }

  @Test
  @DisplayName("Returns the existing sporting not-found response for an absent mapping pack")
  void refusesMissingMappingPack() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(configurationReads.mappingPack(ACCOUNT, ID, 0, 50))
        .thenThrow(new SportingResourceNotFoundException());
    // When
    ResultActions response = mvc.perform(get("/administration/packs/{id}", ID).with(mobileJwt()));
    // Then
    response
        .andExpect(status().isNotFound())
        .andExpect(header().string("Cache-Control", "no-store"));
  }

  private static JwtRequestPostProcessor mobileJwt() {
    return jwt()
        .jwt(
            token -> token.issuer("https://identity.example.invalid/").claim("azp", "mobile-test"));
  }

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
        "{}",
        "{\"classification\":{\"divisionId\":\"00000000-0000-4000-8000-000000000003\"}}",
        "{\"classification\":null,\"active\":true}"
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
    when(classifications.setPool(ACCOUNT, ID, null))
        .thenReturn(new ClassificationView(ID, null, null));
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
                .content("{\"classification\":null}"));
    // Then
    response
        .andExpect(status().isOk())
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$.setting").value(nullValue()))
        .andExpect(jsonPath("$.effective").value(nullValue()));
    verify(classifications).setPool(ACCOUNT, ID, null);
  }

  @Test
  @DisplayName("Returns a safe complete conflict with only scoped identities")
  void exposesConflictScopes() throws Exception {
    // Given
    when(accounts.currentId(any(), any())).thenReturn(Optional.of(ACCOUNT));
    when(classifications.setPack(eq(ACCOUNT), eq(ID), any()))
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
                .content("{\"classification\":null}"));
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
    when(configurationReads.pool(ACCOUNT, ID))
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
    ClassificationView current = new ClassificationView(ID, value, value);
    if (resource.equals("packs")) {
      when(configurationReads.pack(ACCOUNT, ID)).thenReturn(current);
    } else {
      when(configurationReads.pool(ACCOUNT, ID)).thenReturn(current);
    }
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
    when(classifications.setPool(ACCOUNT, ID, value))
        .thenReturn(new ClassificationView(ID, value, value));
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
                    "{\"classification\":{\"divisionId\":\""
                        + ID
                        + "\",\"format\":\"2x2\",\"gender\":\"male\"}}"));
    // Then
    response.andExpect(status().isOk()).andExpect(jsonPath("$.effective.format").value("2x2"));
    verify(classifications).setPool(ACCOUNT, ID, value);
  }
}
