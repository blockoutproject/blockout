import { DiscoveryScreen } from "@/features/onboarding/screens/discovery-screen";

/** F14 discovery route; the root owns F12 priority and this session's discovery completion. */
export default function OnboardingRoute() {
  return <DiscoveryScreen />;
}
