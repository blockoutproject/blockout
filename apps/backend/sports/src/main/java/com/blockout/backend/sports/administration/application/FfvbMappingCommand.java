package com.blockout.backend.sports.administration.application;

import com.blockout.backend.sports.reference.domain.*;
import java.util.*;

/** Immutable input for FFVB administration; generated HTTP models stay at the adapter. */
public record FfvbMappingCommand(UUID divisionId, TeamFormat format, TeamGender gender) {}
