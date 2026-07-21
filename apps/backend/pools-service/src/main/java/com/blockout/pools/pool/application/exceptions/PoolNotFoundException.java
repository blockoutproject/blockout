package com.blockout.pools.pool.application.exceptions;

/**
 * Raised when a Pool identifier does not exist.
 */
public class PoolNotFoundException extends RuntimeException {
    public PoolNotFoundException(Long id) {
        super("Pool not found with id " + id);
    }
}
