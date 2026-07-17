package com.blockout.teams.team.application;

import java.util.List;

public record TeamClubIdPage(List<String> items, int page, int pageSize, long totalItems, boolean hasNext) {
}
