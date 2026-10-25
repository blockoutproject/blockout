package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads confirmed private state under the same original-account lock as follow writers. */
@Service
@RequiredArgsConstructor
public class ReadFollowState {
  private final CurrentFollowTarget target;
  private final FollowStore store;

  /**
   * Reads confirmed state under the same original-account lock used by writers.
   *
   * @param context already admitted original owner and exact target
   * @return persisted relation existence; absence needs no row
   * @throws AccountNotFoundException when the original lifecycle has disappeared
   * @throws FollowUnavailableTargetException for an unknown or currently hidden target
   */
  @Transactional
  public boolean read(FollowContext context) {
    target.require(context);
    return store.find(context).isPresent();
  }
}
