package com.blockout.backend.accounts.api;

import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.config.MappingConfiguration;
import com.blockout.backend.generated.mobile.model.AccountPermissionsResponse;
import com.blockout.backend.generated.mobile.model.AccountResponse;
import com.blockout.backend.shared.api.RequiredNullableMapping;
import java.util.Set;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValueCheckStrategy;

/** Common generated account representation for reads, establishment and profile changes. */
@Mapper(config = MappingConfiguration.class, uses = RequiredNullableMapping.class)
public interface AccountApiMapper {
  /**
   * Maps already-loaded account data and the current in-process grant projection without I/O.
   *
   * @param account current usable profile
   * @param hasPhoto current accepted-photo presence supplied by the account owner
   * @param permissions current grants from CurrentPermissions
   * @return the generated response used by every AccountsApi profile operation
   */
  @Mapping(target = "accountId", source = "account.id")
  @Mapping(target = "additionalProperties", ignore = true)
  @Mapping(
      target = "principalCreatedAt",
      source = "account.principalCreatedAt",
      nullValueCheckStrategy = NullValueCheckStrategy.ON_IMPLICIT_CONVERSION)
  AccountResponse toDto(Account account, boolean hasPhoto, Set<Permission> permissions);

  /**
   * Projects independent grants into all known canonical capability fields.
   *
   * @param permissions current grants, never inferred from a role or Pro entitlement
   * @return explicit booleans for presentation; resource eligibility remains owner-controlled
   */
  default AccountPermissionsResponse toDto(Set<Permission> permissions) {
    return new AccountPermissionsResponse()
        .manageMaintenance(permissions.contains(Permission.MANAGE_MAINTENANCE))
        .manageApplicationVersions(permissions.contains(Permission.MANAGE_APPLICATION_VERSIONS))
        .bypassMaintenance(permissions.contains(Permission.BYPASS_MAINTENANCE))
        .manageSportingPresentation(permissions.contains(Permission.MANAGE_SPORTING_PRESENTATION))
        .manageSportingClassification(
            permissions.contains(Permission.MANAGE_SPORTING_CLASSIFICATION))
        .manageDivisionLifecycle(permissions.contains(Permission.MANAGE_DIVISION_LIFECYCLE))
        .manageCollection(permissions.contains(Permission.MANAGE_COLLECTION))
        .moderateStreamLinks(permissions.contains(Permission.MODERATE_STREAM_LINKS));
  }
}
