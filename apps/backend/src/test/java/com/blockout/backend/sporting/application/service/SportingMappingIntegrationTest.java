package com.blockout.backend.sporting.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.collection.application.port.CollectionStore;
import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.generated.mobile.model.MappingFilterDimensionEnum;
import com.blockout.backend.generated.mobile.model.MappingStatusEnum;
import com.blockout.backend.shared.pagination.OffsetPage;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.model.CatalogObservation;
import com.blockout.backend.sporting.application.model.PoolKey;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingFilterOption;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPack;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPackFilters;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPool;
import com.blockout.backend.sporting.application.model.SportingMapping.PackMappingDetail;
import com.blockout.backend.sporting.application.model.SportingPresentation.DivisionDefinition;
import com.blockout.backend.sporting.application.model.SportingViews.DivisionDetail;
import com.blockout.backend.sporting.application.model.SportingViews.PoolView;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.port.SportingStore;
import com.blockout.backend.testsupport.PostgresTestConfiguration;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Import(PostgresTestConfiguration.class)
@Transactional
@DisplayName("Authorized sporting catalogue mapping over PostgreSQL")
class SportingMappingIntegrationTest {
  private static final UUID DEFAULT_DIVISION =
      UUID.fromString("00000000-0000-4000-8000-000000000041");
  private static final UUID CUSTOM_DIVISION =
      UUID.fromString("00000000-0000-4000-8000-000000000042");
  private static final MappingPackFilters UNFILTERED =
      new MappingPackFilters(null, null, null, null);

  @Autowired private ReadSportingConfiguration reads;
  @Autowired private ChangeSportingClassification writes;
  @Autowired private ChangeDivisionLifecycle divisions;
  @Autowired private ChangeCollectionSeasons seasons;
  @Autowired private AccountStore accounts;
  @Autowired private CollectionStore collection;
  @Autowired private SportingStore sporting;
  @Autowired private JdbcTemplate sql;
  @Autowired private EntityManager entityManager;
  private UUID operator;

  @BeforeEach
  void grantClassification() {
    operator = operator(Permission.MANAGE_SPORTING_CLASSIFICATION, "Mapping_Operator");
  }

  @Test
  @DisplayName("Reads a preparing catalogue with the classification grant alone")
  void distinguishesCollectionPermission() {
    SeasonView season = seasons.getOrCreate(2026);
    Source source = source(season, CollectionProviderEnum.FFVB, "001");
    PoolView created = discover(source, "Pack", "A", "Poule A");
    UUID collector = operator(Permission.MANAGE_COLLECTION, "Mapping_Collector");

    assertThatThrownBy(() -> reads.mappingPacks(collector, UNFILTERED, 0, 1))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> reads.mappingPack(collector, created.packId(), 0, 1))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(
            () -> reads.mappingFilterOptions(collector, MappingFilterDimensionEnum.SOURCE, 0, 1))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> reads.mappingPack(operator, source.id(), 0, 1))
        .isInstanceOf(SportingResourceNotFoundException.class);

    OffsetPage<MappingPack> page = reads.mappingPacks(operator, UNFILTERED, 0, 1);
    assertThat(page.items())
        .containsExactly(
            new MappingPack(
                created.packId(),
                "Pack",
                source.id(),
                "FFVB / 001",
                season.id(),
                "2026/2027",
                null,
                null,
                MappingStatusEnum.NONE,
                1,
                0));
    assertThat(reads.mappingPack(operator, created.packId(), 0, 1).pools().items())
        .containsExactly(new MappingPool(created.id(), "Poule A", null, null, true));
  }

  @Test
  @DisplayName("Maps a newly created editorial division to an existing native pool and source")
  void mapsNewEditorialDivision() {
    // Given
    SeasonView season = seasons.getOrCreate(2026);
    Source source = source(season, CollectionProviderEnum.FFVB, "001");
    PoolView pool = discover(source, "Pack", "A", "Poule A");
    UUID editor = operator(Permission.MANAGE_DIVISION_LIFECYCLE, "Mapping_Division_Editor");

    // When
    DivisionDetail created =
        divisions.create(
            editor, new DivisionDefinition("Coupe de printemps", "#112233", null), null);
    SportingClassification classification =
        new SportingClassification(created.id(), SportFormatEnum._6X6, SportGenderEnum.FEMALE);
    writes.setPool(operator, pool.id(), classification);
    entityManager.flush();
    entityManager.clear();

    // Then
    PoolView mapped = sporting.pool(pool.key()).orElseThrow();
    assertThat(mapped.id()).isEqualTo(pool.id());
    assertThat(mapped.packId()).isEqualTo(pool.packId());
    assertThat(mapped.classification()).isEqualTo(classification);
    assertThat(collection.sources(season.id())).containsExactly(source);
  }

  @Test
  @DisplayName(
      "Projects current inheritance and overrides while retaining published classification")
  void derivesCoverageFromCurrentSettings() {
    SeasonView season = seasons.getOrCreate(2026);
    Source source = source(season, CollectionProviderEnum.FFVB, "001");
    PoolView inherited = discover(source, "Pack", "A", "A - Du pack");
    PoolView custom = discover(source, "Pack", "B", "B - Personnalisée");
    SportingClassification defaultClassification =
        division(DEFAULT_DIVISION, "Default", SportFormatEnum._6X6, SportGenderEnum.FEMALE);
    SportingClassification customClassification =
        division(CUSTOM_DIVISION, "Custom", SportFormatEnum._4X4, SportGenderEnum.MIXED);
    UUID pack = inherited.packId();
    writes.setPack(operator, pack, defaultClassification);
    writes.setPool(operator, custom.id(), customClassification);

    PackMappingDetail withDefault = reads.mappingPack(operator, pack, 0, 2);
    assertThat(withDefault.pack().defaultClassification()).isEqualTo(defaultClassification);
    assertThat(withDefault.pack().status()).isEqualTo(MappingStatusEnum.ALL);
    assertThat(withDefault.pack().classifiedPoolCount()).isEqualTo(2);
    assertThat(withDefault.pools().items())
        .containsExactly(
            new MappingPool(inherited.id(), "A - Du pack", defaultClassification, "Default", true),
            new MappingPool(
                custom.id(), "B - Personnalisée", customClassification, "Custom", false));

    writes.setPack(operator, pack, null);

    PackMappingDetail withoutDefault = reads.mappingPack(operator, pack, 0, 2);
    assertThat(withoutDefault.pack().defaultClassification()).isNull();
    assertThat(withoutDefault.pack().status()).isEqualTo(MappingStatusEnum.SOME);
    assertThat(withoutDefault.pack().classifiedPoolCount()).isEqualTo(1);
    assertThat(withoutDefault.pools().items())
        .containsExactly(
            new MappingPool(inherited.id(), "A - Du pack", null, null, true),
            new MappingPool(
                custom.id(), "B - Personnalisée", customClassification, "Custom", false));
    assertThat(sporting.pool(inherited.id()).orElseThrow().classification())
        .isEqualTo(defaultClassification);

    writes.setPool(operator, inherited.id(), customClassification);

    PackMappingDetail allOverrides = reads.mappingPack(operator, pack, 0, 2);
    OffsetPage<MappingPack> allPacks =
        reads.mappingPacks(
            operator, new MappingPackFilters(null, MappingStatusEnum.ALL, null, null), 0, 1);
    assertThat(allOverrides.pack().defaultClassification()).isNull();
    assertThat(allOverrides.pack().status()).isEqualTo(MappingStatusEnum.ALL);
    assertThat(allOverrides.pack().classifiedPoolCount()).isEqualTo(2);
    assertThat(allPacks.items()).containsExactly(allOverrides.pack());
  }

  @Test
  @DisplayName("Searches across pack, source and multiple pool labels and filters before slicing")
  void filtersBeforePaging() {
    SeasonView current = seasons.getOrCreate(2026);
    SeasonView preparing = seasons.getOrCreate(2027);
    Source currentWest = source(current, CollectionProviderEnum.FFVB, "Ouest");
    Source futureWest = source(preparing, CollectionProviderEnum.FFVB, "Ouest");
    Source east = source(current, CollectionProviderEnum.FFVB, "Est");
    Source lnvWest = source(current, CollectionProviderEnum.LNV, "Ouest");
    PoolView first = discover(east, "A - Régionale", "A", "Sélection");
    PoolView selected = discover(currentWest, "Z - Régionale", "A", "Sélection");
    discover(currentWest, "Z - Régionale", "B", "Écrin");
    PoolView otherSeason = discover(futureWest, "Y - Régionale", "A", "Sélection");
    discover(futureWest, "Y - Régionale", "B", "Écrin");
    discover(lnvWest, "Ouest", "A", "Sélection");
    SportingClassification setting =
        division(CUSTOM_DIVISION, "Custom", SportFormatEnum._4X4, SportGenderEnum.MIXED);
    writes.setPool(operator, selected.id(), setting);

    assertThat(reads.mappingPacks(operator, UNFILTERED, 0, 1).items())
        .extracting(MappingPack::id)
        .containsExactly(first.packId());
    String search = "REgionale: sélection / ECRIN, ouest FFVB";
    OffsetPage<MappingPack> matching =
        reads.mappingPacks(operator, new MappingPackFilters(search, null, null, null), 0, 1);
    assertThat(matching.items()).extracting(MappingPack::id).containsExactly(otherSeason.packId());
    assertThat(matching.hasNext()).isTrue();

    OffsetPage<MappingPack> scoped =
        reads.mappingPacks(
            operator,
            new MappingPackFilters("Écrin", MappingStatusEnum.SOME, futureWest.id(), current.id()),
            0,
            1);
    assertThat(scoped.items()).extracting(MappingPack::id).containsExactly(selected.packId());
    assertThat(scoped.items().getFirst().poolCount()).isEqualTo(2);
    assertThat(scoped.items().getFirst().classifiedPoolCount()).isEqualTo(1);
    assertThat(scoped.hasNext()).isFalse();
    assertThat(
            reads
                .mappingPacks(
                    operator, new MappingPackFilters(null, null, futureWest.id(), null), 0, 2)
                .items())
        .extracting(MappingPack::id)
        .containsExactly(otherSeason.packId(), selected.packId());
    assertThat(
            reads
                .mappingPacks(
                    operator,
                    new MappingPackFilters(null, MappingStatusEnum.NONE, null, preparing.id()),
                    0,
                    1)
                .items())
        .extracting(MappingPack::id)
        .containsExactly(otherSeason.packId());
  }

  @Test
  @DisplayName(
      "Uses the pack's own setting for childless aggregates and excludes withdrawn children")
  void fallsBackToChildlessPack() {
    SeasonView season = seasons.getOrCreate(2026);
    Source source = source(season, CollectionProviderEnum.FFVB, "001");
    PoolView withdrawn = discover(source, "Childless pack", "A", "Withdrawn");
    entityManager.flush();
    sql.update("UPDATE sporting_pool SET catalog_eligible = FALSE WHERE id = ?", withdrawn.id());
    entityManager.clear();
    SportingClassification setting =
        division(DEFAULT_DIVISION, "Default", SportFormatEnum._6X6, SportGenderEnum.FEMALE);
    UUID pack = withdrawn.packId();

    PackMappingDetail before = reads.mappingPack(operator, pack, 0, 1);
    assertThat(before.pools().items()).isEmpty();
    assertThat(before.pack().poolCount()).isZero();
    assertThat(before.pack().classifiedPoolCount()).isZero();
    assertThat(before.pack().status()).isEqualTo(MappingStatusEnum.NONE);
    assertThat(
            reads
                .mappingPacks(operator, new MappingPackFilters("Withdrawn", null, null, null), 0, 1)
                .items())
        .isEmpty();

    writes.setPack(operator, pack, setting);

    PackMappingDetail after = reads.mappingPack(operator, pack, 0, 1);
    assertThat(after.pools().items()).isEmpty();
    assertThat(after.pack().classifiedPoolCount()).isZero();
    assertThat(after.pack().status()).isEqualTo(MappingStatusEnum.ALL);
    assertThat(after.pack().defaultClassification()).isEqualTo(setting);
  }

  @Test
  @DisplayName("Pages tied pool names by UUID and bounds display labels without changing identity")
  void boundsDetails() {
    SeasonView season = seasons.getOrCreate(2026);
    Source source = source(season, CollectionProviderEnum.FFVB, "É".repeat(270));
    String packLabel = "🏐".repeat(270);
    String poolLabel = "🦉".repeat(270);
    PoolView first = discover(source, packLabel, "A", poolLabel);
    PoolView second = discover(source, packLabel, "B", poolLabel);
    List<UUID> ids = new ArrayList<>(List.of(first.id(), second.id()));
    ids.sort(Comparator.comparing(UUID::toString));

    PackMappingDetail firstPage = reads.mappingPack(operator, first.packId(), 0, 1);
    PackMappingDetail secondPage = reads.mappingPack(operator, first.packId(), 1, 1);
    PackMappingDetail distantPage =
        reads.mappingPack(operator, first.packId(), 9007199254740991L, 1);

    assertThat(firstPage.pack().id()).isEqualTo(first.packId());
    assertThat(firstPage.pack().label()).isEqualTo("🏐".repeat(256));
    assertThat(firstPage.pack().sourceLabel()).isEqualTo("FFVB / " + "É".repeat(249));
    assertThat(firstPage.pools().items())
        .containsExactly(new MappingPool(ids.getFirst(), "🦉".repeat(256), null, null, true));
    assertThat(firstPage.pools().hasNext()).isTrue();
    assertThat(secondPage.pools().items())
        .containsExactly(new MappingPool(ids.getLast(), "🦉".repeat(256), null, null, true));
    assertThat(secondPage.pools().hasNext()).isFalse();
    assertThat(distantPage.pools().items()).isEmpty();
    assertThat(distantPage.pools().hasNext()).isFalse();
    assertThat(distantPage.pack().poolCount()).isEqualTo(2);
  }

  @Test
  @DisplayName("Reads paged filter options across mapped seasons and deduplicates native sources")
  void readsOptionsAcrossAllMappingPacks() {
    SeasonView older = seasons.getOrCreate(2025);
    SeasonView newest = seasons.getOrCreate(2026);
    SeasonView unmapped = seasons.getOrCreate(2027);
    Source olderWest = source(older, CollectionProviderEnum.FFVB, "Ouest");
    Source newerWest = source(newest, CollectionProviderEnum.FFVB, "Ouest");
    Source east = source(older, CollectionProviderEnum.FFVB, "Est");
    source(unmapped, CollectionProviderEnum.FFVB, "Nord");
    discover(olderWest, "Older Pack", "A", "One");
    discover(newerWest, "Newer Pack", "A", "Two");
    discover(east, "East Pack", "A", "Three");

    OffsetPage<MappingFilterOption> firstSource =
        reads.mappingFilterOptions(operator, MappingFilterDimensionEnum.SOURCE, 0, 1);
    OffsetPage<MappingFilterOption> secondSource =
        reads.mappingFilterOptions(operator, MappingFilterDimensionEnum.SOURCE, 1, 1);
    OffsetPage<MappingFilterOption> firstSeason =
        reads.mappingFilterOptions(operator, MappingFilterDimensionEnum.SEASON, 0, 1);
    OffsetPage<MappingFilterOption> secondSeason =
        reads.mappingFilterOptions(operator, MappingFilterDimensionEnum.SEASON, 1, 1);

    assertThat(firstSource.items())
        .containsExactly(new MappingFilterOption(east.id(), "FFVB / Est"));
    assertThat(secondSource.items())
        .containsExactly(new MappingFilterOption(newerWest.id(), "FFVB / Ouest"));
    assertThat(firstSource.hasNext()).isTrue();
    assertThat(secondSource.hasNext()).isFalse();
    assertThat(firstSeason.items())
        .containsExactly(new MappingFilterOption(newest.id(), "2026/2027"));
    assertThat(secondSeason.items())
        .containsExactly(new MappingFilterOption(older.id(), "2025/2026"));
    assertThat(firstSeason.hasNext()).isTrue();
    assertThat(secondSeason.hasNext()).isFalse();
  }

  private UUID operator(Permission permission, String username) {
    UUID id =
        accounts
            .create(
                "https://identity.example.invalid/",
                "auth0|" + username,
                username,
                username + "@example.invalid")
            .id();
    sql.update(
        "INSERT INTO account_permission(account_id, permission) VALUES (?, ?)",
        id,
        permission.getValue());
    return id;
  }

  private Source source(SeasonView season, CollectionProviderEnum provider, String organizer) {
    return collection.createSource(
        season.id(), provider, organizer, "https://source.example.invalid/");
  }

  private PoolView discover(Source source, String pack, String reference, String name) {
    PoolKey key =
        new PoolKey(
            source.provider(),
            source.seasonId(),
            source.organizerReference(),
            pack,
            null,
            null,
            reference);
    UUID id =
        sporting.acceptCatalogPool(
            key, new CatalogObservation.Pool(pack, pack, reference, null, null, null, null, name));
    return sporting.pool(id).orElseThrow();
  }

  private SportingClassification division(
      UUID id, String label, SportFormatEnum format, SportGenderEnum gender) {
    sql.update(
        "INSERT INTO sporting_division(id,name,active,color) VALUES (?, ?, TRUE, '#112233')",
        id,
        label);
    return new SportingClassification(id, format, gender);
  }
}
