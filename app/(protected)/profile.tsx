import TabViewExample from "@/modules/TabViewExample";

import React from "react";
import { View, StyleSheet, Button } from "react-native";

import { useAuth0 } from "react-native-auth0";

export default function Profile() {
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

            <TabViewExample />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        padding: 16,
    },
});
