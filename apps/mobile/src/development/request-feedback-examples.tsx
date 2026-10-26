import { ErrorState } from "../shared/components/state-card";
import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../shared/components/button";
import { RequestLoading } from "../shared/components/request-feedback";
import { useTheme } from "../shared/theme/theme-provider";
import { tokens } from "../shared/theme/tokens";

/** Local controlled examples for native qualification; no network, business operation or production route. */
export function RequestFeedbackExamplesScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [allowRetry, setAllowRetry] = useState(true);
  const [attempts, setAttempts] = useState(0);
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          États de lecture initiale
        </Text>
        <View>
          {loading ? (
            <RequestLoading />
          ) : (
            <ErrorState
              retrying={retrying}
              onRetry={
                allowRetry
                  ? () => {
                      setAttempts((count) => count + 1);
                      setRetrying(true);
                    }
                  : undefined
              }
            />
          )}
        </View>
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          Tentatives explicites : {attempts}
        </Text>
        <Button
          label={loading ? "Afficher l’échec" : "Afficher le chargement"}
          fullWidth
          onPress={() => setLoading(!loading)}
        />
        <Button
          label="Terminer la tentative"
          fullWidth
          disabled={!retrying}
          onPress={() => setRetrying(false)}
        />
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          Reprise autorisée par l’appelant
        </Text>
        <Switch
          accessibilityLabel="Reprise autorisée par l’appelant"
          value={allowRetry}
          onValueChange={setAllowRetry}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: tokens.spacing.section, gap: tokens.spacing.lg },
});
