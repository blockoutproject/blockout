package com.blockout.collector.acquisition.application;

import java.net.URI;

/**
 * Complete bounded source content and its provenance, shared by acquisition and its adapters.
 * Observation time and logical order remain with the passage that admits the read.
 *
 * @param body complete decompressed content, retained only while its admitted scopes are consumed
 * @param url actual final source URL after permitted redirects
 * @param supplierRead whether these bytes came from a new supplier response rather than cache reuse
 */
public record ProviderResponse(byte[] body, URI url, boolean supplierRead) {}
