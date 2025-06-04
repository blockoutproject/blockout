import React from 'react';
import { View, Text } from 'react-native';

export const ErrorState = ({ message }: { message: string }) => (
    <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Text style={{ fontSize: 14, color: 'red' }}>{message}</Text>
    </View>
);