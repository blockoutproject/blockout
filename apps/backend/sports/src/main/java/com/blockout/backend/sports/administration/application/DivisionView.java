package com.blockout.backend.sports.administration.application;

import com.blockout.backend.sports.reference.domain.*;
import java.util.*;

/** Immutable read projection for FFVB administration; generated HTTP models stay at the adapter. */
public record DivisionView(UUID id, String name, boolean active) {}
