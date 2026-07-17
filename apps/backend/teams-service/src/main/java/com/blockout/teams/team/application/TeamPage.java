package com.blockout.teams.team.application;

import java.util.List;

public record TeamPage(List<TeamView> items, int page, int pageSize, long totalItems, boolean hasNext) {
}
