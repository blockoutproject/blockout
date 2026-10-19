package com.blockout.backend.sporting.infrastructure;

import java.time.Instant;
import java.util.UUID;

/** Native aggregate projection of each pool's latest reliable match start within a time window. */
interface PoolMatchStart {
  UUID getPoolId();

  Instant getLatestStart();
}
