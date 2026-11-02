package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.UUID;

/**
 * Scalar presentation facts shared by single and batch reads, without loading retained image bytes.
 *
 * @param id original resource identity
 * @param sourceName current attributable name
 * @param manualName independent full-name override
 * @param manualShortName independent short-name override when supported
 * @param revision current resource presentation revision
 * @param provider team source, or null for another resource
 * @param hasLogo whether manual image bytes exist
 * @param hasSourceLogo whether professional source artwork exists
 * @param clubId optional team club
 * @param clubHasLogo whether the optional club has artwork
 */
record SportingPresentationRow(
    UUID id,
    String sourceName,
    String manualName,
    String manualShortName,
    long revision,
    CollectionProviderEnum provider,
    boolean hasLogo,
    boolean hasSourceLogo,
    UUID clubId,
    boolean clubHasLogo) {}
