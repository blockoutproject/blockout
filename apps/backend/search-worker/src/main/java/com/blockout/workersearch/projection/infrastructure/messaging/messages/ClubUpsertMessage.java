package com.blockout.workersearch.projection.infrastructure.messaging.messages;

public record ClubUpsertMessage(String id, String name, String logoUrl, String city) {}
