import { render, userEvent } from "@testing-library/react-native";
import React from "react";

import type { MatchLiveLinkHistoryResponse } from "@/src/shared/generated/models";
import MatchLiveLinksHistoryItem from "@/src/modules/match/ui/moderation/match-live-links-history-item";
import { ThemeProvider } from "@/src/shared/theme";

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

const pendingLink: MatchLiveLinkHistoryResponse = {
  id: 42,
  matchId: 7,
  provider: "YOUTUBE",
  url: "https://youtube.com/watch?v=blockout",
  status: "PENDING",
  reportCount: 2,
  ownerAuth0Id: "moderation-owner",
  createdAt: "2026-04-25T18:30:00Z",
  lastUpdate: "2026-04-25T19:00:00Z",
};

describe("MatchLiveLinksHistoryItem", () => {
  it("exposes pending moderation commands and preserves their domain payload", async () => {
    const onApprove = jest.fn();
    const onReject = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <MatchLiveLinksHistoryItem
          link={pendingLink}
          onApprove={onApprove}
          onReject={onReject}
          onDeleteActive={jest.fn()}
          onReactivate={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("En attente")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Supprimer le lien" }),
    ).toBeNull();

    await user.press(screen.getByRole("button", { name: "Valider le lien" }));
    await user.press(screen.getByRole("button", { name: "Refuser le lien" }));

    expect(onApprove).toHaveBeenCalledWith(pendingLink);
    expect(onReject).toHaveBeenCalledWith(pendingLink);
  });

  it("switches to the active-link command without exposing pending actions", async () => {
    const onDeleteActive = jest.fn();
    const activeLink = { ...pendingLink, status: "ACTIVE" as const };
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <MatchLiveLinksHistoryItem
          link={activeLink}
          onApprove={jest.fn()}
          onReject={jest.fn()}
          onDeleteActive={onDeleteActive}
          onReactivate={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Actif")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Valider le lien" }),
    ).toBeNull();

    await user.press(screen.getByRole("button", { name: "Supprimer le lien" }));

    expect(onDeleteActive).toHaveBeenCalledWith(activeLink);
  });
});
