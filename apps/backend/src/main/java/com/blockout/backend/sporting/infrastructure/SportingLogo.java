package com.blockout.backend.sporting.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Current object reference and metadata used to recognize unchanged sporting artwork. */
@Embeddable
record SportingLogo(
    @Column(name = "logo_key") String objectKey,
    @Column(name = "logo_media_type") String mediaType,
    @Column(name = "logo_sha256", length = 64) String sha256) {

  boolean matches(String candidateMediaType, String candidateSha256) {
    return candidateMediaType.equals(mediaType) && candidateSha256.equals(sha256);
  }
}
