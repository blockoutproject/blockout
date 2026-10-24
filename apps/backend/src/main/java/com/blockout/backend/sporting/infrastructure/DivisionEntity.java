package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Administered division with persisted presentation and an independent explicit lifecycle. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "sporting_division")
public class DivisionEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  @Setter
  private String name;

  @Column(nullable = false)
  @Setter
  private boolean active;

  @Version private long revision;

  @Column(nullable = false)
  @Setter
  private String color;

  @Setter private String gradientStart;
  @Setter private String gradientMiddle;
  @Setter private String gradientEnd;
  @Setter private byte[] logo;
  @Setter private String logoMediaType;
  @Setter private Integer logoSize;

  @ElementCollection
  @CollectionTable(name = "sporting_division_term", joinColumns = @JoinColumn(name = "division_id"))
  @Column(name = "term", nullable = false)
  private Set<String> searchTerms = new HashSet<>();

  /**
   * Creates complete presentation and explicit initial activity in one save.
   *
   * @param name nonblank unique division name
   * @param color validated primary sRGB color
   * @param gradient three validated colors, or null
   * @param logo validated PNG/JPEG bytes, or null
   * @param mediaType actual content type, or null
   */
  public DivisionEntity(
      String name, String color, List<String> gradient, byte[] logo, String mediaType) {
    this.name = name;
    this.active = true;
    this.color = color;
    if (gradient != null) {
      this.gradientStart = gradient.get(0);
      this.gradientMiddle = gradient.get(1);
      this.gradientEnd = gradient.get(2);
    }
    this.logo = logo;
    this.logoMediaType = mediaType;
    this.logoSize = logo == null ? null : logo.length;
  }
}
