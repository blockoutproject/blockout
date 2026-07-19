package com.blockout.matches.match.application.views;

import java.time.Instant;

public record CurrentUserView(Long id, String auth0Id, Instant createdAt) {
}
