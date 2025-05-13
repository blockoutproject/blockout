import React from 'react';
import { Stack } from 'expo-router';
import TeamHeader from '@/src/components/team/TeamHeader';

const TeamLayout: React.FC = () => {

    return (
        <Stack
            screenOptions={{
                presentation: 'modal',
                header: () => <TeamHeader />,
            }}
        >
            <Stack.Screen name="[teamId]" />
        </Stack>
    );
}

export default TeamLayout;