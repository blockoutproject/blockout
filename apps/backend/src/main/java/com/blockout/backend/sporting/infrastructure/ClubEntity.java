package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Persistent provider-qualified organization; an unknown page label remains null. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_club")
public class ClubEntity {
  @Setter private long localityRevision;
  @Setter private Long geocodedRevision;

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CollectionProviderEnum provider;

  @Column(nullable = false)
  private String reference;

  @Setter private String sourceName;
  @Setter private String manualName;
  @Setter private long presentationRevision;
  @Setter private long contactsRevision;
  @Setter private long logoRevision;
  @Setter private byte[] logo;
  @Setter private String logoMediaType;
  @Setter private Long detailCycleOrder;
  @Setter private Long detailReadOrdinal;
  @Setter private Instant detailObservedAt;
  @Setter private Instant detailPublishedAt;
  @Setter private Double latitude;
  @Setter private Double longitude;
  @Setter private Long localityCycleOrder;
  @Setter private Long localityReadOrdinal;

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "sourceValue", column = @Column(name = "address")),
    @AttributeOverride(name = "manualValue", column = @Column(name = "address_manual")),
    @AttributeOverride(name = "mode", column = @Column(name = "address_mode", nullable = false)),
    @AttributeOverride(
        name = "restricted",
        column = @Column(name = "address_restricted", nullable = false))
  })
  private ClubContactValue address = new ClubContactValue();

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "sourceValue", column = @Column(name = "municipality")),
    @AttributeOverride(name = "manualValue", column = @Column(name = "municipality_manual")),
    @AttributeOverride(
        name = "mode",
        column = @Column(name = "municipality_mode", nullable = false)),
    @AttributeOverride(
        name = "restricted",
        column = @Column(name = "municipality_restricted", nullable = false))
  })
  private ClubContactValue city = new ClubContactValue();

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "sourceValue", column = @Column(name = "postal_code")),
    @AttributeOverride(name = "manualValue", column = @Column(name = "postal_code_manual")),
    @AttributeOverride(
        name = "mode",
        column = @Column(name = "postal_code_mode", nullable = false)),
    @AttributeOverride(
        name = "restricted",
        column = @Column(name = "postal_code_restricted", nullable = false))
  })
  private ClubContactValue postalCode = new ClubContactValue();

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "sourceValue", column = @Column(name = "email")),
    @AttributeOverride(name = "manualValue", column = @Column(name = "email_manual")),
    @AttributeOverride(name = "mode", column = @Column(name = "email_mode", nullable = false)),
    @AttributeOverride(
        name = "restricted",
        column = @Column(name = "email_restricted", nullable = false))
  })
  private ClubContactValue email = new ClubContactValue();

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "sourceValue", column = @Column(name = "phone")),
    @AttributeOverride(name = "manualValue", column = @Column(name = "phone_manual")),
    @AttributeOverride(name = "mode", column = @Column(name = "phone_mode", nullable = false)),
    @AttributeOverride(
        name = "restricted",
        column = @Column(name = "phone_restricted", nullable = false))
  })
  private ClubContactValue phone = new ClubContactValue();

  @Embedded
  @AttributeOverrides({
    @AttributeOverride(name = "sourceValue", column = @Column(name = "website")),
    @AttributeOverride(name = "manualValue", column = @Column(name = "website_manual")),
    @AttributeOverride(name = "mode", column = @Column(name = "website_mode", nullable = false)),
    @AttributeOverride(
        name = "restricted",
        column = @Column(name = "website_restricted", nullable = false))
  })
  private ClubContactValue website = new ClubContactValue();

  /**
   * @return all six current contact fields, for conversion at the persistence boundary
   */
  Map<ContactField, ClubContactValue> contactValues() {
    return Map.of(
        ContactField.ADDRESS,
        address,
        ContactField.CITY,
        city,
        ContactField.POSTAL_CODE,
        postalCode,
        ContactField.EMAIL,
        email,
        ContactField.PHONE,
        phone,
        ContactField.WEBSITE,
        website);
  }

  /**
   * Replaces the complete decided current contact state inside the locked club transaction.
   *
   * @param values all six independently decided fields
   */
  void replaceContacts(Map<ContactField, ClubContactValue> values) {
    address = values.get(ContactField.ADDRESS);
    city = values.get(ContactField.CITY);
    postalCode = values.get(ContactField.POSTAL_CODE);
    email = values.get(ContactField.EMAIL);
    phone = values.get(ContactField.PHONE);
    website = values.get(ContactField.WEBSITE);
  }

  @ElementCollection
  @CollectionTable(name = "sporting_club_alias", joinColumns = @JoinColumn(name = "club_id"))
  @Getter(AccessLevel.NONE)
  private Set<VerifiedName> aliases = new HashSet<>();

  /**
   * Establishes the supplied club state without generating another owner model.
   *
   * @param provider designated native authority
   * @param reference exact native reference, preserving its original spelling
   * @param sourceName available original source label, or null when unknown
   */
  public ClubEntity(CollectionProviderEnum provider, String reference, String sourceName) {
    this.provider = provider;
    this.reference = reference;
    this.sourceName = sourceName;
  }
}
