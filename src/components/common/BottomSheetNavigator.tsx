import React from "react";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createNavigationContainerRef } from "@react-navigation/native";

import { useAppTheme } from "@/src/context/ThemeProvider";

import MatchScreen from "@/src/components/match/MatchScreen";
import PoolScreen from "@/src/components/pool/PoolScreen";
import TeamScreen from "@/src/components/team/TeamScreen";
import SearchScreen from "@/src/components/search/SearchScreen";
import UserScreen from "@/src/components/user/UserScreen";
import LegalDocumentScreen from "@/src/components/user/LegalDocumentScreen";
import ClubScreen from "@/src/components/club/ClubScreen";

export type SheetStackParamList = {
    Match: { matchId: number };
    Pool: { poolId: number };
    Team: { teamId: number };
    Club: { clubId: string };
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

    return (
        <NavigationIndependentTree>
            <NavigationContainer ref={sheetNavRef}>
                <Stack.Navigator
                    initialRouteName={initialScreen}
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: theme.background },
                    }}
                >
                    <Stack.Screen
                        name="Match"
                        children={() => <MatchScreen onCloseSheet={onCloseSheet} />}
                        initialParams={initialScreen === "Match" ? params : undefined}
                        options={{ animation: "slide_from_right" }}
                    />

                    <Stack.Screen
                        name="Pool"
                        children={() => <PoolScreen onCloseSheet={onCloseSheet} />}
                        initialParams={initialScreen === "Pool" ? params : undefined}
                        options={{ animation: "slide_from_right" }}
                    />

                    <Stack.Screen
                        name="Team"
                        children={() => <TeamScreen onCloseSheet={onCloseSheet} />}
                        initialParams={initialScreen === "Team" ? params : undefined}
                        options={{ animation: "slide_from_right" }}
                    />

                    <Stack.Screen
                        name="Club"
                        children={() => <ClubScreen onCloseSheet={onCloseSheet} />}
                        initialParams={initialScreen === "Club" ? params : undefined}
                        options={{ animation: "slide_from_right" }}
                    />

                    <Stack.Screen
                        name="Search"
                        children={() => <SearchScreen onCloseSheet={onCloseSheet} />}
                        options={{ animation: "fade_from_bottom" }}
                    />

                    <Stack.Screen
                        name="User"
                        children={() => <UserScreen onCloseSheet={onCloseSheet} />}
                        options={{ animation: "slide_from_right" }}
                    />

                    <Stack.Screen
                        name="LegalImprint"
                        children={() => (
                            <LegalDocumentScreen type="imprint" title="Mentions Légales" onCloseSheet={onCloseSheet} />
                        )}
                        options={{ animation: "slide_from_right" }}
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
                        options={{ animation: "slide_from_right" }}
                    />

                    <Stack.Screen
                        name="LegalPrivacy"
                        children={() => (
                            <LegalDocumentScreen
                                type="privacy"
                                title="Politique de Confidentialité"
                                onCloseSheet={onCloseSheet}
                            />
                        )}
                        options={{ animation: "slide_from_right" }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </NavigationIndependentTree>
    );
};

export default BottomSheetNavigator;