import React from 'react';
import { Stack } from 'expo-router';
import TeamHeader from '@/src/components/team/components/TeamHeader';

const TeamLayout: React.FC = () => {
    return (
        <Stack
            screenOptions={{
                presentation: 'card',
                header: () => <TeamHeader />,
            }}
        >
            <Stack.Screen name="[team_id]" />
        </Stack>
    );
}

export default TeamLayout;