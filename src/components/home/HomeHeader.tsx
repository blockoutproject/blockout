import { colors } from "@/src/constants/Colors";

import React from "react";
import {
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import FastImage from 'react-native-fast-image'
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";

const HomeHeader: React.FC = () => {
    const router = useRouter();

    const { user } = useAuth0();

    return (
        <View
            style={{
                backgroundColor: colors.dark,
                paddingTop: 10,
                paddingBottom: 20,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
            }}
        >
            <Text
                style={{
                    color: colors.light,
                    fontSize: 24,
                    fontWeight: "800",
                }}
            >
                BlockOut
            </Text>

            <View
                style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 10,
                    right: 20,
                    position: "absolute",
                }}
            >
                <TouchableOpacity
                    onPress={() => router.navigate("/search")}
                >
                    <MaterialCommunityIcons
                        name="magnify"
                        size={25}
                        color={colors.light}
                    />
                </TouchableOpacity>
                <TouchableOpacity>
                    <MaterialCommunityIcons
                        name={"whistle"}
                        size={25}
                        color={colors.light}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.navigate("/profile")}>
                    <FastImage
                        style={{
                            height: 30,
                            width: 30,
                            borderRadius: 100,
                        }}
                        source={{
                            uri: user?.picture,
                        }}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default HomeHeader;