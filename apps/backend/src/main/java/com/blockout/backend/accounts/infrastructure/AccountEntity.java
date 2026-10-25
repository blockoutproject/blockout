package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.domain.AccountUsername;
import com.blockout.backend.shared.validation.TextTrimming;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Minimal local account identity and provider evidence; the principal remains immutable. */
@Entity
@Table(name = "account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @NotBlank
  @Column(nullable = false, updatable = false)
  private String issuer;

  @NotBlank
  @Column(nullable = false, updatable = false)
  private String subject;

  @NotBlank
  @Pattern(regexp = AccountUsername.FORMAT)
  @Column(nullable = false, length = 32)
  @Setter(AccessLevel.PACKAGE)
  private String username;

  @NotBlank
  @Email
  @Column(nullable = false)
  @Setter(AccessLevel.PACKAGE)
  private String email;

  @Setter(AccessLevel.PACKAGE)
  private Instant principalCreatedAt;

  /**
   * Creates a lifecycle from validated identity evidence; native validation runs before
   * persistence.
   *
   * @param issuer exact validated issuer
   * @param subject exact validated subject
   * @param username neutral candidate, normalized before validation
   * @param email required usable provider address
   * @param principalCreatedAt trustworthy provider instant, or null
   */
  public AccountEntity(
      String issuer, String subject, String username, String email, Instant principalCreatedAt) {
    this.issuer = issuer;
    this.subject = subject;
    this.username = TextTrimming.trim(username);
    this.email = email;
    this.principalCreatedAt = principalCreatedAt;
  }
}
