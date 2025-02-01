
// components/MatchInfoCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type MatchInfoCardProps = {
    date: string; 
    league: string;
    duration?: string;
    venue?: string;
    referee1?: string;
    referee2?: string;
};

export default function MatchInfoCard({
    date,
    league,
    duration,
    venue,
    referee1,
    referee2,
}: MatchInfoCardProps) {
    const infoData = [
        { icon: 'calendar-outline', text: new Date(date).toLocaleString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })},
        {
            icon: 'trophy-outline',
            text: league,
            color: '#2196F3',
        },
        duration && { icon: 'time-outline', text: duration },
        venue && { icon: 'location-outline', text: venue },
        referee1 && { icon: 'eye-outline', text: referee1 },
        referee2 && { icon: 'eye-outline', text: referee2 },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Information</Text>
            {infoData.filter(e => !!e).map((item, index) => (
                <View style={styles.infoRow} key={index}>
                    {/* L’icône Ionicons */}
                    <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.color || '#fff'}
                        style={styles.icon}
                    />
                    <Text
                        style={[
                            styles.infoText,
                            item.color && { color: item.color },
                        ]}
                    >
                        {item.text}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderColor: '#4A4A4A',
        borderRadius: 12,
        backgroundColor: '#111',
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    icon: {
        marginRight: 12,
    },
    infoText: {
        color: '#fff',
        fontSize: 15,
    },
});
