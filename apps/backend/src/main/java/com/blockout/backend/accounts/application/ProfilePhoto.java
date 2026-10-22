package com.blockout.backend.accounts.application;

/**
 * Accepted, metadata-free square pixels for the local account transaction.
 *
 * @param bytes reencoded image, at most 5 MiB
 * @param mediaType detected PNG/JPEG media type
 * @param dimension square side between 1 and 1024 pixels
 */
public record ProfilePhoto(byte[] bytes, String mediaType, int dimension) {}
