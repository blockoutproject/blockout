import { colors } from "@/constants/Colors";
import React from "react";
import { Button, StyleSheet, View } from "react-native";

import { useAuth0 } from "react-native-auth0";

const ProfileScreen: React.FC = () => {
    const { clearSession } = useAuth0();

    const handleLogin = async () => {
        try {
            await clearSession();
        } catch (e) {
            console.log("Failed to connect:", e);
        }
    };

    return (
        <View style={styles.container}>
            <Button title="Se déconnecter" onPress={handleLogin} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.light,
        padding: 16,
    },
});

export default ProfileScreen;
