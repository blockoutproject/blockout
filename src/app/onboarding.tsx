import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useOnboardingFlag } from "@/src/hooks/utils/useOnboardingFlag";
import Onboarding, { EmojiStep } from "../components/common/Onboarding";

const OnboardingScreen = () => {
    const theme = useAppTheme();
    const router = useRouter();
    const { markDone } = useOnboardingFlag();

    const steps: EmojiStep[] = [
        { id: "1", emoji: "⚡️", title: "Scores en direct", description: "Suis tes matchs en temps réel." },
        { id: "2", emoji: "🏆", title: "Classements", description: "Vois l’impact de chaque rencontre." },
        { id: "3", emoji: "🏐", title: "Équipes", description: "Profils, séries et confrontations." },
    ];

    const finish = async () => {
        await markDone();
        router.replace("/sign-in");
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Onboarding steps={steps} onComplete={finish} onSkip={finish} />
        </View>
    );
};

export default OnboardingScreen;
const styles = StyleSheet.create({ container: { flex: 1 } });