package com.blockout.backend.sporting.application;

/**
 * Identified calendar participant; standings rows and undetermined places are not candidates.
 *
 * @param nativeReference required LNV TeamID; FFVB uses its contextual club/name key
 * @param sourceName original provider label
 * @param clubReference attributable FFVB club reference; omitted for LNV
 * @param clubSourceName available club label, or null when its page has not been read
 */
public record TeamCandidate(
    String nativeReference, String sourceName, String clubReference, String clubSourceName) {}
