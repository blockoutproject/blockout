package com.blockout.backend.sports.administration.application;

import com.blockout.backend.sports.reference.domain.*;
import java.time.Instant;
import java.util.*;

/** Immutable read projection for FFVB administration; generated HTTP models stay at the adapter. */
public record FfvbConfigurationView(
    boolean enabled, String season, List<String> sources, Instant updatedAt) {}
