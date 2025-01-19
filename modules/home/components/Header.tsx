import { colors } from "@/assets/constants";

import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

import { useRouter } from "expo-router";

const HomeHeader = () => {
    const router = useRouter();

    return (
        <View
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
                    color: "#e2e2e2",
                    fontSize: 24,
                    fontWeight: "800",
                }}
            >
                Block.Out
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
                    <Image
                        style={{
                            height: 25,
                            width: 25,
                            borderRadius: 100,
                        }}
                        source={{
                            uri: "https://cdn-icons-png.freepik.com/512/1865/1865293.png",
                        }}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.navigate("/profile")}>
                    <Image
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
        </View>
    );
};

export default HomeHeader;
