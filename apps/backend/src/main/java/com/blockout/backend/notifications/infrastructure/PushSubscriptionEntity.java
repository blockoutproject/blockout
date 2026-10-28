package com.blockout.backend.notifications.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Private current connection binding; native database constraints own installation/address
 * uniqueness.
 */
@Entity
@Table(name = "push_subscription")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class PushSubscriptionEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID subscriptionId;

  @Column(nullable = false)
  @Setter
  private UUID installationId;

  @Column(nullable = false)
  @Setter
  private UUID accountId;

  @Column(nullable = false, columnDefinition = "TEXT")
  @Setter
  private String expoPushToken;

  @Version private long revision;

  /**
   * Creates one sign-in binding; revision starts under JPA ownership, without a public version
   * token.
   *
   * @param subscriptionId fresh public sign-in connection UUID; the native row identity is
   *     generated independently
   * @param installationId random installation UUID
   * @param accountId authenticated current original account
   * @param expoPushToken private project-scoped delivery address
   */
  PushSubscriptionEntity(
      UUID subscriptionId, UUID installationId, UUID accountId, String expoPushToken) {
    this.subscriptionId = subscriptionId;
    this.installationId = installationId;
    this.accountId = accountId;
    this.expoPushToken = expoPushToken;
  }
}
