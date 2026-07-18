package com.blockout.pools.pool.application;

public class PoolNotFoundException extends RuntimeException {
    public PoolNotFoundException(Long id) {
        super("Pool not found with id " + id);
    }
}
