import React, { useMemo, useRef, useState } from "react";
import {
    TouchableOpacity,
    StyleSheet,
    Button,
    View,
    Keyboard,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import ColorPicker, { Preview, Panel1, HueSlider } from "reanimated-color-picker";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import BottomSheetCustomModal from "./BottomSheetCustomModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
    value: string;
    onChange: (color: string) => void;
    size?: number;
}

const isValidHex = (c: string) => /^#([0-9A-F]{3}){1,2}$/i.test(c);

const CircleColorPicker: React.FC<Props> = ({
    value,
    onChange,
    size = 48,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const sheetRef = useRef<BottomSheetModal>(null);

    const safeColor = useMemo(() => (isValidHex(value) ? value : theme.surface), [value]);

    const [tempColor, setTempColor] = useState(safeColor);

    const open = () => {
        Keyboard.dismiss();
        setTempColor(safeColor);
        sheetRef.current?.present();
    };
    const close = () => sheetRef.current?.dismiss();

    const handleValidate = () => {
        onChange(tempColor);
        close();
    };

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.circle,
                    {
                        width: size,
                        height: size,
                        backgroundColor: safeColor,
                        borderColor: theme.border,
                    },
                ]}
                onPress={open}
            />

            <BottomSheetCustomModal ref={sheetRef}  >
                <View style={{ padding: 8, paddingBottom: insets.bottom }}>
                <ColorPicker
                    value={tempColor}
                    onCompleteJS={(c) => setTempColor(c.hex)}
                    boundedThumb
                >
                    <Preview style={{ marginBottom: 16 }} />
                    <Panel1 style={{ marginBottom: 16 }} />
                    <HueSlider style={{ marginBottom: 40 }} />
                </ColorPicker>

                <View style={[styles.buttonRow, { backgroundColor: tempColor }]}>
                    <Button title="Valider" onPress={handleValidate} color={theme.text} />
                </View>
            </View>
            </BottomSheetCustomModal>
        </>
    );
};

const styles = StyleSheet.create({
    circle: {
        borderRadius: 999,
        borderWidth: 2,
    },
    buttonRow: {
        borderRadius: 999,
        padding: 4,
        marginHorizontal: 10,
    },
});

export default CircleColorPicker;