package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;

/** Current eligible membership facts selected before presentation hydration. */
record TeamPoolRow(UUID teamId, UUID poolId) {}
