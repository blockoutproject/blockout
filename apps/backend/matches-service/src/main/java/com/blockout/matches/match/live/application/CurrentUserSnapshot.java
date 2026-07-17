package com.blockout.matches.match.live.application;

import java.time.Instant;

public record CurrentUserSnapshot(String auth0Id, Instant createdAt) {
}
