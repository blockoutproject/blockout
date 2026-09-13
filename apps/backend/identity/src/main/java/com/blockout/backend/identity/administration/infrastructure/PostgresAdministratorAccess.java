package com.blockout.backend.identity.administration.infrastructure;

import com.blockout.backend.identity.administration.application.AdministratorAccess;
import com.blockout.backend.identity.administration.domain.LocalRole;
import com.blockout.backend.identity.user.domain.ExternalIdentity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Reads current local role and account state together on each protected operation. */
public final class PostgresAdministratorAccess implements AdministratorAccess {
  private final JdbcClient sql;

  /**
   * Uses the existing identity datasource for uncached permission reads.
   *
   * @param template identity datasource shared with the local profile owner
   */
  public PostgresAdministratorAccess(JdbcTemplate template) {
    sql = JdbcClient.create(template);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<UUID> find(ExternalIdentity actor) {
    return sql.sql(
            "SELECT u.id FROM identity.users u JOIN identity.external_identities e ON e.user_id=u.id JOIN identity.user_roles r ON r.user_id=u.id WHERE e.issuer=? AND e.subject=? AND u.active AND r.role=?")
        .params(actor.issuer(), actor.subject(), LocalRole.ADMIN.name())
        .query(UUID.class)
        .optional();
  }
}
