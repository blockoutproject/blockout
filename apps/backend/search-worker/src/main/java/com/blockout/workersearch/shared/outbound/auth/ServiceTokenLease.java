package com.blockout.workersearch.shared.outbound.auth;

public record ServiceTokenLease(String accessToken, long expiresInSeconds) {
}
