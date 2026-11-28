import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { Button } from "@/shared/components/button";
import { EmptyState } from "@/shared/components/state-card";

/** Empty current visibility offers manual discovery without claiming that retained relations were erased. */
export function NoAvailableFollows() {
  const router = useRouter();
  return (
    <EmptyState
      title="Aucun suivi à afficher"
      description="Recherchez une équipe ou une poule pour suivre ses matchs."
    >
      <Button
        label="Rechercher une équipe ou une poule"
        leadingIcon={Search}
        fullWidth
        onPress={() => router.push("/search")}
      />
    </EmptyState>
  );
}
