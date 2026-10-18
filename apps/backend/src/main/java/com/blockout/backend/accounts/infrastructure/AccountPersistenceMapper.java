package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.config.MappingConfiguration;
import org.mapstruct.Mapper;

/** Mechanical account snapshot mapping; provider-preservation decisions stay in the domain. */
@Mapper(config = MappingConfiguration.class)
interface AccountPersistenceMapper {
  /**
   * Detaches the account's identity and minimal profile without exporting persistence state.
   *
   * @param source persistent original account
   * @return immutable domain account
   */
  Account toDomain(AccountEntity source);
}
