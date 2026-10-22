import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import Purchases from "react-native-purchases";
import { createSessionGeneration } from "../../accounts";
import { getProState, type ProSessionState, type ProState } from "../pro-state";
import { customerInfo, entitlement } from "../test-support/customer-info";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));

/**
 * F03/F11 consumption doubles explicitly allowed by T006. F09 state projection is real;
 * public content, remaining ad eligibility and personal/admin decisions remain their owners' doubles.
 * T011 must replace these collaborators before claiming cross-feature integration.
 */
function ControlledConsumers({
  state,
  adEligible,
}: {
  state: ProState;
  adEligible: () => boolean;
}) {
  const [sport, setSport] = useState<string | null>(null);
  const mayUseF11 = state.status === "guest" || state.status === "inactive";
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carte de poule"
        onPress={() => setSport("Carte de poule complète")}
      >
        <Text>Carte de poule</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Calendrier du club"
        onPress={() => setSport("Matchs à venir et terminés")}
      >
        <Text>Calendrier du club</Text>
      </Pressable>
      {sport && <Text>{sport}</Text>}
      {mayUseF11 && adEligible() && <Text>Publicité F11 contrôlée</Text>}
      {state.status === "inactive" &&
        state.operation !== "pending" &&
        state.operation !== "uncertain" && (
          <Text>Offre volontaire contrôlée</Text>
        )}
    </>
  );
}

const session = {
  generation: "synthetic-session-246",
  accountId: "00000000-0000-4000-8000-000000000246",
};
const activePaid = { "Blockout Pro": entitlement() };
const activeGift = {
  "Blockout Pro": entitlement({ store: "PROMOTIONAL", willRenew: false }),
};
const expired = { "Blockout Pro": entitlement({ isActive: false }) };
const empty = customerInfo({
  active: {},
  all: {},
  verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
});
const native: ProSessionState = {
  session,
  association: "associated",
  customerInfo: empty,
  operation: "idle",
};

it.each([
  {
    label: "guest with former paid evidence",
    status: "guest",
    evidence: {
      ...native,
      customerInfo: customerInfo({
        active: activePaid,
        all: activePaid,
        verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    },
    ads: true,
    offer: false,
  },
  {
    label: "paid active",
    status: "authenticated",
    evidence: {
      ...native,
      customerInfo: customerInfo({
        active: activePaid,
        all: activePaid,
        verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    },
    ads: false,
    offer: false,
  },
  {
    label: "gift active",
    status: "authenticated",
    evidence: {
      ...native,
      customerInfo: customerInfo({
        active: activeGift,
        all: activeGift,
        verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    },
    ads: false,
    offer: false,
  },
  {
    label: "inactive",
    status: "authenticated",
    evidence: native,
    ads: true,
    offer: true,
  },
  {
    label: "expired",
    status: "authenticated",
    evidence: {
      ...native,
      customerInfo: customerInfo({
        active: {},
        all: expired,
        verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    },
    ads: true,
    offer: true,
  },
  {
    label: "association pending",
    status: "authenticated",
    evidence: { ...native, association: "pending" },
    ads: false,
    offer: false,
  },
  {
    label: "association failed",
    status: "authenticated",
    evidence: { ...native, association: "failed" },
    ads: false,
    offer: false,
  },
  {
    label: "unknown signed-in rights",
    status: "authenticated",
    evidence: { ...native, customerInfo: null },
    ads: false,
    offer: false,
  },
  {
    label: "no native evidence",
    status: "authenticated",
    evidence: null,
    ads: false,
    offer: false,
  },
] satisfies {
  label: string;
  status: "guest" | "authenticated";
  evidence: ProSessionState | null;
  ads: boolean;
  offer: boolean;
}[])(
  "keeps complete public sport independent of $label and delegates only eligible states to F11",
  async ({ status, evidence, ads, offer }) => {
    // Given
    const adEligible = jest.fn(() => true);
    const state = getProState({ status, getSnapshot: () => session }, evidence);
    await render(<ControlledConsumers state={state} adEligible={adEligible} />);
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("button", { name: "Carte de poule" }));
    expect(screen.getByText("Carte de poule complète")).toBeOnTheScreen();
    await user.press(
      screen.getByRole("button", { name: "Calendrier du club" }),
    );

    // Then
    expect(screen.getByText("Matchs à venir et terminés")).toBeOnTheScreen();
    expect(!!screen.queryByText("Publicité F11 contrôlée")).toBe(ads);
    expect(!!screen.queryByText("Offre volontaire contrôlée")).toBe(offer);
    if (!ads) expect(adEligible).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/vérification|connexion|acheter/i),
    ).not.toBeOnTheScreen();
  },
);

it("keeps remaining F11 refusal authoritative for an inactive account", async () => {
  // Given
  const adEligible = jest.fn(() => false);
  const state = getProState(
    { status: "authenticated", getSnapshot: () => session },
    native,
  );

  // When
  await render(<ControlledConsumers state={state} adEligible={adEligible} />);

  // Then
  expect(adEligible).toHaveBeenCalled();
  expect(screen.queryByText("Publicité F11 contrôlée")).not.toBeOnTheScreen();
});

it("rejects old paid evidence on a new generation, including a return to the same account", async () => {
  // Given
  const generation = createSessionGeneration();
  generation.setAccount(generation.getSnapshot().generation, session.accountId);
  const former = generation.getSnapshot();
  generation.invalidate();
  generation.setAccount(generation.getSnapshot().generation, session.accountId);

  // When
  const state = getProState(
    { status: "authenticated", getSnapshot: generation.getSnapshot },
    {
      ...native,
      session: former,
      customerInfo: customerInfo({
        active: activePaid,
        all: activePaid,
        verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    },
  );
  const adEligible = jest.fn(() => true);
  await render(<ControlledConsumers state={state} adEligible={adEligible} />);

  // Then
  expect(state.status).toBe("unavailable");
  expect(adEligible).not.toHaveBeenCalled();
  expect(
    screen.queryByText("Offre volontaire contrôlée"),
  ).not.toBeOnTheScreen();
});
