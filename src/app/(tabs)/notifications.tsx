import { View, Text, StyleSheet } from 'react-native';

export default function NotificationsScreen() {
    return (
        <View style={styles.container}>
            <Text>Tab [Notification]</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
