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
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionException;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Current PostgreSQL admission shared by ordinary mobile HTTP and the existing F05 account binding.
 * Internal consumers read current maintenance in process without ordinary mobile admission.
 */
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
   * Anonymous public requests supply no principal and cannot request active bypass.
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
                if (issuer == null || subject == null)
                  throw new AccessDeniedException("Action is not permitted");
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
      throw new AccountUnavailableException(unavailable(failure));
    }
  }

  /**
   * Reads current validated SQL state for internal admission, including F07's future handoff owner.
   * It neither admits mobile access nor suspends ingestion, inbox work or collection. A separate
   * short read transaction avoids a caller's already hydrated JPA settings surviving activation.
   *
   * @return the maintenance observed by this read, without a cache or end-time promise
   * @throws AccessSettingsUnavailableException if current state cannot be established
   */
  public MaintenanceSettings currentMaintenance() {
    try {
      TransactionTemplate read = new TransactionTemplate(transactions);
      read.setReadOnly(true);
      read.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
      return read.execute(status -> settings.maintenance());
    } catch (AccessSettingsUnavailableException
        | DataAccessException
        | TransactionException failure) {
      throw unavailable(failure);
    }
  }

  /**
   * Owns one bounded diagnostic without logging rejected values, identities or dependency messages.
   *
   * @param failure unavailable configuration or transaction, retained only as an internal cause
   * @return generic configuration unavailability for the consuming owner to translate
   */
  private AccessSettingsUnavailableException unavailable(RuntimeException failure) {
    log.atError()
        .addKeyValue("operation", "maintenance_admission")
        .addKeyValue("outcome", "unavailable")
        .addKeyValue(
            "reason",
            switch (failure) {
              case AccessSettingsUnavailableException _ -> "configuration_unavailable";
              case DataAccessException _ -> "database_unavailable";
              default -> "transaction_failed";
            })
        .log("Maintenance admission unavailable");
    return new AccessSettingsUnavailableException(failure);
  }
}
