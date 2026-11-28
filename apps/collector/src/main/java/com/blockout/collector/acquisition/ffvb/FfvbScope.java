package com.blockout.collector.acquisition.ffvb;

/** Backend-qualified native season and pool; tour/group exist only when independently published. */
public record FfvbScope(
    String seasonLabel,
    String organizerReference,
    String competitionReference,
    String poolReference,
    String tourReference,
    String groupReference) {}
