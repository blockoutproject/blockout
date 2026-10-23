package com.blockout.backend.access.application;

import com.blockout.backend.access.domain.AccessSettingsUnavailableException;
import com.blockout.backend.access.domain.MaintenanceRequiredException;
import com.blockout.backend.access.domain.MaintenanceSettings;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.AccountAdmission;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionTemplate;

/** F12's current PostgreSQL policy for F05's existing ordinary-account admission boundary. */
@Service
@Slf4j
@RequiredArgsConstructor
public class MaintenanceAdmission implements AccountAdmission {
  private final AccessSettingsStore settings;
  private final AccountAccess accounts;
  private final ActionAuthorization authorization;
  private final PlatformTransactionManager transactions;

  /**
   * {@inheritDoc}
   *
   * <p>The settings read orders admission against maintenance activation. A short operation already
   * admitted can finish. Active bypass checks the current business lifecycle and grant under its
   * account lock; inactive maintenance requires neither a pre-existing profile nor a bypass grant.
   * The admission transaction ends before F05 starts provider I/O or its own business transaction.
   *
   * @throws MaintenanceRequiredException when active maintenance blocks ordinary intent
   * @throws AccessDeniedException when active bypass lacks a usable account or current grant
   */
  @Override
  public Optional<UUID> requireOrdinaryAccess(String issuer, String subject, boolean bypass) {
    try {
      return new TransactionTemplate(transactions)
          .execute(
              status -> {
                MaintenanceSettings maintenance = settings.maintenance();
                if (!maintenance.active()) return Optional.empty();
                if (!bypass) throw new MaintenanceRequiredException(maintenance);
                UUID account =
                    accounts
                        .currentId(issuer, subject)
                        .orElseThrow(() -> new AccessDeniedException("Action is not permitted"));
                authorization.require(account, Permission.BYPASS_MAINTENANCE);
                return Optional.of(account);
              });
    } catch (AccessSettingsUnavailableException
        | DataAccessException
        | TransactionException failure) {
      log.atError()
          .addKeyValue("operation", "maintenance_admission")
          .addKeyValue("outcome", "unavailable")
          .addKeyValue(
              "reason",
              failure instanceof AccessSettingsUnavailableException
                  ? "configuration_unavailable"
                  : failure instanceof DataAccessException
                      ? "database_unavailable"
                      : "transaction_failed")
          .log("Account admission unavailable");
      throw new AccountUnavailableException(failure);
    }
  }
}
