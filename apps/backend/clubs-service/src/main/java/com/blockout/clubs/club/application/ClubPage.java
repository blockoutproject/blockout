package com.blockout.clubs.club.application;

import java.util.List;

public record ClubPage(List<ClubView> items, int page, int pageSize, long totalItems, boolean hasNext) {
}
