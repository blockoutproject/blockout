package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.collection.application.model.CollectionState.Source;
import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import com.blockout.backend.sporting.application.model.SportingClassification;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingFilterOption;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPack;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingPool;
import com.blockout.backend.sporting.application.model.SportingMapping.MappingStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/** Native reads of retained pack identities and current catalogue children. */
interface SportingMappingRepository extends Repository<PackEntity, UUID> {
  int LABEL_LIMIT = 256;

  String PACK_CONTEXT =
      """
      FROM sporting_pack pack
      JOIN collection_source_binding source ON source.season_id = pack.season_id
        AND source.provider = pack.provider AND source.organizer_reference = pack.organizer_reference
      JOIN sporting_season season ON season.id = pack.season_id
      """;

  // Complete settings share a division id as their presence marker. A pack default therefore
  // classifies every child without an override, including the childless pack fallback.
  String PACK_PROJECTION =
      """
      SELECT pack.id, LEFT(pack.reference, 256) AS label, source.id AS "sourceId",
        source.provider, LEFT(source.organizer_reference, 256) AS "organizerReference",
        season.id AS "seasonId", LEFT(season.label, 256) AS "seasonLabel",
        pack.setting_division_id AS "divisionId", LEFT(division.name, 256) AS "divisionName",
        pack.setting_format AS format, pack.setting_gender AS gender,
        coverage.pool_count AS "poolCount", coverage.status
      """
          + PACK_CONTEXT
          + """
      LEFT JOIN sporting_division division ON division.id = pack.setting_division_id
      CROSS JOIN LATERAL (
        SELECT COUNT(*) AS pool_count,
          CASE
            WHEN pack.setting_division_id IS NOT NULL THEN 'ALL'
            WHEN COUNT(pool.setting_division_id) = 0 THEN 'NONE'
            WHEN COUNT(pool.setting_division_id) = COUNT(*) THEN 'ALL'
            ELSE 'SOME'
          END AS status
        FROM sporting_pool pool WHERE pool.pack_id = pack.id AND pool.catalog_eligible
      ) coverage
      """;

  /** Filters the complete pack projection before applying the pageable offset. */
  @Query(
      value =
          """
          WITH terms AS (
            SELECT value FROM regexp_split_to_table(
              regexp_replace(LOWER(normalize(CAST(:search AS TEXT), NFD)) COLLATE "C",
                U&'[\\0300-\\036f]', '', 'g') COLLATE "default",
              '[^[:alnum:]]+') AS term(value)
            WHERE value <> ''
          )
          """
              + PACK_PROJECTION
              + """
            WHERE (CAST(:seasonId AS UUID) IS NULL OR season.id = :seasonId)
              AND (CAST(:sourceId AS UUID) IS NULL OR EXISTS (
                SELECT 1 FROM collection_source_binding selected WHERE selected.id = :sourceId
                  AND selected.provider = source.provider
                  AND selected.organizer_reference = source.organizer_reference
              ))
              AND (CAST(:status AS TEXT) IS NULL OR coverage.status = :status)
              AND NOT EXISTS (
                SELECT 1 FROM terms
                WHERE POSITION(terms.value IN regexp_replace(LOWER(normalize(
                  CONCAT_WS(' ', pack.reference, source.provider, source.organizer_reference), NFD
                )) COLLATE "C", U&'[\\0300-\\036f]', '', 'g')) = 0
                  AND NOT EXISTS (
                    SELECT 1 FROM sporting_pool pool
                    WHERE pool.pack_id = pack.id AND pool.catalog_eligible
                      AND POSITION(terms.value IN regexp_replace(LOWER(normalize(
                        pool.source_name, NFD
                      )) COLLATE "C", U&'[\\0300-\\036f]', '', 'g')) > 0
                  )
              )
            ORDER BY LOWER(pack.reference), pack.id
          """,
      nativeQuery = true)
  Slice<PackRow> packs(String search, String status, UUID sourceId, UUID seasonId, Pageable page);

  @Query(value = PACK_PROJECTION + "WHERE pack.id = :packId", nativeQuery = true)
  Optional<PackRow> pack(UUID packId);

  @Query(
      value =
          """
          SELECT pool.id, LEFT(pool.source_name, 256) AS label,
            pool.setting_division_id AS "divisionId", LEFT(division.name, 256) AS "divisionName",
            pool.setting_format AS format, pool.setting_gender AS gender
          FROM sporting_pool pool
          LEFT JOIN sporting_division division ON division.id = pool.setting_division_id
          WHERE pool.pack_id = :packId AND pool.catalog_eligible
          ORDER BY LOWER(pool.source_name), pool.id
          """,
      nativeQuery = true)
  Slice<PoolRow> pools(UUID packId, Pageable page);

  /** A source option is represented by the newest mapped binding of that native source. */
  @Query(
      value =
          """
          SELECT id, provider, LEFT(organizer_reference, 256) AS "organizerReference"
          FROM (
            SELECT DISTINCT ON (source.provider, source.organizer_reference)
              source.id, source.provider, source.organizer_reference
          """
              + PACK_CONTEXT
              + """
            ORDER BY source.provider, source.organizer_reference, season.start_year DESC, source.id
          ) mapped_source
          ORDER BY LOWER(CONCAT_WS(' ', provider, organizer_reference)), id
          """,
      nativeQuery = true)
  Slice<SourceRow> sources(Pageable page);

  @Query(
      value =
          """
          SELECT DISTINCT season.id, LEFT(season.label, 256) AS label, season.start_year
          """
              + PACK_CONTEXT
              + "ORDER BY season.start_year DESC, season.id",
      nativeQuery = true)
  Slice<SeasonRow> seasons(Pageable page);

  interface PackRow extends SourceLabelRow, SettingRow {
    UUID getId();

    String getLabel();

    UUID getSourceId();

    UUID getSeasonId();

    String getSeasonLabel();

    String getStatus();

    long getPoolCount();

    default MappingPack toPack() {
      return new MappingPack(
          getId(),
          getLabel(),
          getSourceId(),
          sourceLabel(),
          getSeasonId(),
          getSeasonLabel(),
          classification(),
          getDivisionName(),
          MappingStatus.valueOf(getStatus()),
          Math.toIntExact(getPoolCount()));
    }
  }

  interface PoolRow extends SettingRow {
    UUID getId();

    String getLabel();

    default MappingPool toPool(MappingPack pack) {
      SportingClassification override = classification();
      boolean inherited = override == null;
      return new MappingPool(
          getId(),
          getLabel(),
          SportingClassification.effective(override, pack::defaultClassification),
          inherited ? pack.defaultDivisionName() : getDivisionName(),
          inherited);
    }
  }

  interface SettingRow {
    UUID getDivisionId();

    String getDivisionName();

    String getFormat();

    String getGender();

    default SportingClassification classification() {
      UUID divisionId = getDivisionId();
      return divisionId == null
          ? null
          : new SportingClassification(
              divisionId,
              SportFormatEnum.valueOf(getFormat()),
              SportGenderEnum.valueOf(getGender()));
    }
  }

  interface SourceLabelRow {
    String getProvider();

    String getOrganizerReference();

    default String sourceLabel() {
      String label = Source.label(getProvider(), getOrganizerReference());
      int length = Math.min(LABEL_LIMIT, label.codePointCount(0, label.length()));
      return label.substring(0, label.offsetByCodePoints(0, length));
    }
  }

  interface SourceRow extends SourceLabelRow {
    UUID getId();

    default MappingFilterOption toOption() {
      return new MappingFilterOption(getId(), sourceLabel());
    }
  }

  interface SeasonRow {
    UUID getId();

    String getLabel();

    default MappingFilterOption toOption() {
      return new MappingFilterOption(getId(), getLabel());
    }
  }
}
