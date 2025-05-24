import React from 'react';
import { View, Text } from 'react-native';

export const EmptyList = ({ message }: { message: string }) => (
    <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#999' }}>{message}</Text>
    </View>
);