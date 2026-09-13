package com.blockout.backend.sports.administration.infrastructure;

import com.blockout.backend.sports.administration.application.*;
import com.blockout.backend.sports.reference.domain.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * JDBC adapter for small explicit administration operations; no provider calls or implicit imports.
 */
public final class PostgresFfvbAdministration implements FfvbAdministrationStore {
  private final JdbcTemplate template;
  private final JdbcClient sql;

  /**
   * Uses native JDBC clients bound to the same transaction-aware datasource.
   *
   * @param template shared datasource bound to owner transactions
   */
  public PostgresFfvbAdministration(JdbcTemplate template) {
    this.template = template;
    this.sql = JdbcClient.create(template);
  }

  /** {@inheritDoc} */
  @Override
  public FfvbConfigurationView configuration() {
    List<String> sources =
        sql.sql("SELECT code FROM sports.ffvb_sources ORDER BY code").query(String.class).list();
    return sql.sql("SELECT enabled, season, updated_at FROM sports.ffvb_configuration WHERE id=1")
        .query(
            (row, _) ->
                new FfvbConfigurationView(
                    row.getBoolean("enabled"),
                    row.getString("season"),
                    sources,
                    row.getTimestamp("updated_at") == null
                        ? null
                        : row.getTimestamp("updated_at").toInstant()))
        .single();
  }

  /** {@inheritDoc} */
  @Override
  public void replaceConfiguration(FfvbConfigurationCommand command, UUID actor, Instant now) {
    sql.sql(
            "UPDATE sports.ffvb_configuration SET enabled=?, season=?, updated_by=?, updated_at=? WHERE id=1")
        .params(command.enabled(), command.season(), actor, Timestamp.from(now))
        .update();
    sql.sql("DELETE FROM sports.ffvb_sources").update();
    template.batchUpdate(
        "INSERT INTO sports.ffvb_sources(code) VALUES (?)",
        command.sources(),
        256,
        (statement, source) -> statement.setString(1, source));
  }

  /** {@inheritDoc} */
  @Override
  public SportsSlice<DivisionView> divisions(int page, int size) {
    return SportsSlice.from(
        sql.sql("SELECT id, name, active FROM sports.divisions ORDER BY name, id LIMIT ? OFFSET ?")
            .params(size + 1, (long) page * size)
            .query(DivisionView.class)
            .list(),
        page,
        size);
  }

  /** {@inheritDoc} */
  @Override
  public ReferenceResult<DivisionView> division(
      UUID id, DivisionCommand command, UUID actor, Instant now, boolean create) {
    // Small administration writes share one lock so name conflicts remain expected outcomes.
    sql.sql("SELECT id FROM sports.ffvb_configuration WHERE id=1 FOR UPDATE")
        .query(Integer.class)
        .single();
    if (!create
        && !sql.sql("SELECT EXISTS(SELECT 1 FROM sports.divisions WHERE id=?)")
            .param(id)
            .query(Boolean.class)
            .single()) return new ReferenceResult<>(ReferenceChange.MISSING, null);
    if (sql.sql("SELECT EXISTS(SELECT 1 FROM sports.divisions WHERE name=? AND id<>?)")
        .params(command.name(), id)
        .query(Boolean.class)
        .single()) return new ReferenceResult<>(ReferenceChange.CONFLICT, null);
    sql.sql(
            "INSERT INTO sports.divisions(id,name,active,updated_by,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, active=excluded.active, updated_by=excluded.updated_by, updated_at=excluded.updated_at")
        .params(id, command.name(), command.active(), actor, Timestamp.from(now))
        .update();
    return new ReferenceResult<>(
        ReferenceChange.APPLIED, new DivisionView(id, command.name(), command.active()));
  }

  /** {@inheritDoc} */
  @Override
  public SportsSlice<FfvbMappingView> mappings(
      int page, int size, Boolean mapped, boolean activeOnly) {
    String filter = "";
    if (mapped != null)
      filter = mapped ? " AND m.division_id IS NOT NULL" : " AND m.division_id IS NULL";
    if (activeOnly) filter += " AND d.active=true";
    List<FfvbMappingView> rows =
        sql.sql(
                "SELECT m.id,m.organizer,m.label,m.division_id,m.format,m.gender FROM sports.ffvb_mappings m LEFT JOIN sports.divisions d ON d.id=m.division_id WHERE true"
                    + filter
                    + " ORDER BY m.organizer,m.label,m.id LIMIT ? OFFSET ?")
            .params(size + 1, (long) page * size)
            .query(FfvbMappingView.class)
            .list();
    return SportsSlice.from(rows, page, size);
  }

  /** {@inheritDoc} */
  @Override
  public ReferenceResult<FfvbMappingView> mapping(
      UUID id, FfvbMappingCommand command, UUID actor, Instant now) {
    sql.sql("SELECT id FROM sports.ffvb_configuration WHERE id=1 FOR UPDATE")
        .query(Integer.class)
        .single();
    Optional<FfvbMappingView> existing =
        sql.sql(
                "SELECT id,organizer,label,division_id,format,gender FROM sports.ffvb_mappings WHERE id=?")
            .param(id)
            .query(FfvbMappingView.class)
            .optional();
    if (existing.isEmpty()) return new ReferenceResult<>(ReferenceChange.MISSING, null);
    if (!sql.sql("SELECT EXISTS(SELECT 1 FROM sports.divisions WHERE id=? AND active)")
        .param(command.divisionId())
        .query(Boolean.class)
        .single()) return new ReferenceResult<>(ReferenceChange.CONFLICT, null);
    sql.sql(
            "UPDATE sports.ffvb_mappings SET division_id=?, format=?, gender=?, updated_by=?, updated_at=? WHERE id=?")
        .params(
            command.divisionId(),
            command.format().name(),
            command.gender().name(),
            actor,
            Timestamp.from(now),
            id)
        .update();
    FfvbMappingView old = existing.get();
    return new ReferenceResult<>(
        ReferenceChange.APPLIED,
        new FfvbMappingView(
            id,
            old.organizer(),
            old.label(),
            command.divisionId(),
            command.format(),
            command.gender()));
  }
}
