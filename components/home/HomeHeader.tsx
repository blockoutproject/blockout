import { colors } from "@/constants/Colors";

import React from "react";
import {
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import FastImage from 'react-native-fast-image'
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";

const HomeHeader: React.FC = () => {
    const router = useRouter();

    return (
        <SafeAreaView
            style={{
                backgroundColor: colors.dark,
                height: 60,
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
                            uri: "https://www.zoologiste.com/images/xl/capybara.jpg",
                        }}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default HomeHeader;