import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, Button } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import ColorPicker, {
    Preview,
    Panel1,
    HueSlider,
    Swatches,
} from 'reanimated-color-picker';
import { View } from 'react-native';
import { useGlobalBottomSheet } from '@/src/context/GlobalBottomSheetProvider';

interface Props {
    value: string;
    onChange: (color: string) => void;
    size?: number;
}

const isValidHex = (color: string): boolean =>
    /^#([0-9A-F]{3}){1,2}$/i.test(color);

const CircleColorPicker: React.FC<Props> = ({ value, onChange, size = 48 }) => {
    const theme = useAppTheme();
    const { openPopup, closeSheetById } = useGlobalBottomSheet();

    const safeColor = useMemo(() => {
        return isValidHex(value) ? value : '#ffffff';
    }, [value]);

    const openColorPicker = () => {
        const sheetId = openPopup(
            <View>
                <ColorPicker
                    value={safeColor}
                    onCompleteJS={(c) => {
                        onChange(c.hex);
                    }}
                    boundedThumb
                >
                    <Preview />
                    <Panel1 />
                    <HueSlider />
                </ColorPicker>
                <View style={styles.buttonRow}>
                    <View style={styles.button}>
                        <Button
                            title="Valider"
                            onPress={() => closeSheetById(sheetId)}
                        />
                    </View>
                </View>
            </View>
        );
    };

    return (
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
            onPress={openColorPicker}
        />
    );
};

const styles = StyleSheet.create({
    circle: {
        borderRadius: 999,
        borderWidth: 1,
        marginHorizontal: 6,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginVertical: 16,
    },
    button: {
        flex: 1,
        marginHorizontal: 4,
    },
});

export default CircleColorPicker;