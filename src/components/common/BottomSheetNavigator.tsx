import React, { useState } from 'react';

import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';

import { useAppTheme } from '@/src/context/ThemeProvider';

import MatchHeader from '../match/components/MatchHeader';
import PoolHeader from '../pool/components/PoolHeader';
import TeamHeader from '../team/components/TeamHeader';
import SearchHeader from '@/src/components/search/components/SearchHeader';

import MatchScreen from '../match/MatchScreen';
import PoolScreen from '../pool/PoolScreen';
import TeamScreen from '../team/TeamScreen';
import SearchScreen from '@/src/components/search/SearchScreen';

import type { Filter } from '@/src/types/Filter';
import UserScreen from '../user/UserScreen';
import LegalDocumentScreen from '../user/LegalDocumentScreen';

export type SheetStackParamList = {
    Match: { matchId: number };
    Pool: { poolId: number };
    Team: { teamId: number };
    Search: {};
    User: {};
    LegalImprint: {};
    LegalTerms: {};
    LegalPrivacy: {};
};

export const sheetNavRef = createNavigationContainerRef<SheetStackParamList>();

export function resetSheetTo<T extends keyof SheetStackParamList>(
    name: T,
    params: SheetStackParamList[T]
) {
    if (sheetNavRef.isReady()) {
        sheetNavRef.reset({
            index: 0,
            routes: [{ name, params } as any],
        });
    }
}

const Stack = createNativeStackNavigator<SheetStackParamList>();

const BottomSheetNavigator = ({
    initialScreen,
    params,
    onCloseSheet,
}: {
    initialScreen: keyof SheetStackParamList;
    params: any;
    onCloseSheet: () => void;
}) => {
    const theme = useAppTheme();

    const [searchFilters, setSearchFilters] = useState<Filter[]>([
        { name: 'Équipes', isActive: true },
        { name: 'Clubs', isActive: false },
        { name: 'Poules', isActive: false },
    ]);

    return (
        <NavigationIndependentTree>
            <NavigationContainer ref={sheetNavRef}>
                <Stack.Navigator
                    initialRouteName={initialScreen}
                    screenOptions={{
                        contentStyle: { backgroundColor: theme.background },
                    }}
                >
                    <Stack.Screen
                        name="Match"
                        component={MatchScreen}
                        initialParams={initialScreen === 'Match' ? params : undefined}
                        options={{
                            headerTransparent: true,
                            header: () => <MatchHeader onCloseSheet={onCloseSheet} />,
                            animation: 'slide_from_right',
                        }}
                    />

                    <Stack.Screen
                        name="Pool"
                        component={PoolScreen}
                        initialParams={initialScreen === 'Pool' ? params : undefined}
                        options={{
                            header: () => <PoolHeader onCloseSheet={onCloseSheet} />,
                            animation: 'slide_from_right',
                        }}
                    />

                    <Stack.Screen
                        name="Team"
                        component={TeamScreen}
                        initialParams={initialScreen === 'Team' ? params : undefined}
                        options={{
                            header: () => <TeamHeader onCloseSheet={onCloseSheet} />,
                            animation: 'slide_from_right',
                        }}
                    />

                    <Stack.Screen
                        name="Search"
                        options={{
                            headerShown: true,
                            animation: 'fade_from_bottom',
                            header: () => (
                                <SearchHeader
                                    onCloseSheet={onCloseSheet}
                                    filters={searchFilters}
                                    setFilters={setSearchFilters}
                                />
                            ),
                        }}
                    >
                        {() => (
                            <SearchScreen
                                filters={searchFilters}
                                setFilters={setSearchFilters}
                            />
                        )}
                    </Stack.Screen>

                    <Stack.Screen
                        name="User"
                        children={() => (
                            <UserScreen onCloseSheet={onCloseSheet} />
                        )}
                        options={{
                            headerShown: false, // le header est géré DANS UserScreen
                            animation: 'slide_from_right',
                        }}
                    />

                    <Stack.Screen
                        name="LegalImprint"
                        children={() => (
                            <LegalDocumentScreen
                                type="imprint"
                                title="Mentions Légales"
                                onCloseSheet={onCloseSheet}
                            />
                        )}
                        options={{
                            animation: 'slide_from_right',
                            headerShown: false
                        }}
                    />

                    <Stack.Screen
                        name="LegalTerms"
                        children={() => (
                            <LegalDocumentScreen
                                type="terms"
                                title="Conditions Générales d'Utilisation"
                                onCloseSheet={onCloseSheet}
                            />
                        )}
                        options={{
                            animation: 'slide_from_right',
                            headerShown: false
                        }} />

                    <Stack.Screen
                        name="LegalPrivacy"
                        children={() => (
                            <LegalDocumentScreen
                                type="privacy"
                                title="Politique de Confidentialité"
                                onCloseSheet={onCloseSheet}
                            />
                        )}
                        options={{
                            animation: 'slide_from_right',
                            headerShown: false
                        }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </NavigationIndependentTree>
    );
};

export default BottomSheetNavigator;