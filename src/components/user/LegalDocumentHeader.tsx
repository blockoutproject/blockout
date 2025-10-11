import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";

/** Header for a legal document in a sheet. */
export type LegalDocumentHeaderProps = {
    /** Title to display. */
    title: string;
    /** Close sheet callback. */
    onCloseSheet?: () => void;
    /** Open edit form. */
    onEdit?: () => void;
};

const LegalDocumentHeader: React.FC<LegalDocumentHeaderProps> = ({ title, onCloseSheet, onEdit }) => {
    const theme = useAppTheme();
    const { handleBack } = useBackOrClose(onCloseSheet);

    return (
        <View
            style={styles.container}
            testID="legal-doc-header"
        >
            <View
                style={styles.header}
            >
                <View
                    style={styles.leftGroup}
                >
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.backButton}
                        hitSlop={{
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10,
                        }}
                    >
                        <Ionicons
                            name={"close"}
                            size={35}
                            color={theme.text}
                        />
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.title,
                            {
                                color: theme.text,
                            },
                        ]}
                        adjustsFontSizeToFit
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                </View>

                {onEdit ? (
                    <TouchableOpacity
                        onPress={onEdit}
                        hitSlop={{
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10,
                        }}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name="pencil"
                            size={22}
                            color={theme.text}
                        />
                    </TouchableOpacity>
                ) : (
                    <View
                        style={{
                            width: 30,
                        }}
                    />
                )}
            </View>
        </View>
    );
};

export default LegalDocumentHeader;

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
    },
    leftGroup: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backButton: {
        marginRight: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: "900",
    },
});