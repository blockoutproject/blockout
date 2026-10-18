package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.domain.Account;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;

/** Mechanical account snapshot mapping; provider-preservation decisions stay in the domain. */
@Mapper(
    componentModel = MappingConstants.ComponentModel.SPRING,
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
interface AccountPersistenceMapper {
  /**
   * Detaches the account's identity and minimal profile without exporting persistence state.
   *
   * @param source persistent original account
   * @return immutable domain account
   */
  Account toDomain(AccountEntity source);
}
