package com.blockout.backend.jobs;

/** Owner adapter for one versioned job type. External effects must be idempotent. */
public interface JobHandler {
  String type();

  int version();

  void handle(Job job) throws Exception;
}
