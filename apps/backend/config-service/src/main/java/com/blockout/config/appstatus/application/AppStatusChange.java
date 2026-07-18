package com.blockout.config.appstatus.application;

public record AppStatusChange(Long id, AppStatusView before, AppStatusView after) {
}
