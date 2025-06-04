import { useAppTheme } from '@/src/context/ThemeProvider';
import React from 'react';
import { View, Text } from 'react-native';

export const EmptyList = ({ message }: { message: string }) => {
    const theme = useAppTheme();
    return (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: theme.textInactive }}>{message}</Text>
        </View>
    )
};