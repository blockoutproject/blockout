import React, {useMemo, useRef, useState} from "react";
import {Button, Keyboard, StyleSheet, TouchableOpacity, View,} from "react-native";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import ColorPicker, {HueSlider, Panel1, Preview} from "reanimated-color-picker";
import {BottomSheetModal, BottomSheetView} from "@gorhom/bottom-sheet";
import BottomSheetCustomModal from "../bottomSheet/BottomSheetCustomModal";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import {CORNERS} from "@/src/shared/theme/tokens";

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
    Haptics.selectionAsync();
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

      <BottomSheetCustomModal ref={sheetRef}>
        <BottomSheetView style={{padding: 8, paddingBottom: insets.bottom}}>
          <ColorPicker
            value={tempColor}
            onCompleteJS={(c) => setTempColor(c.hex)}
            boundedThumb
          >
            <Preview style={{marginBottom: 16}}/>
            <Panel1 style={{marginBottom: 16}}/>
            <HueSlider style={{marginBottom: 40}}/>
          </ColorPicker>

          <View style={[styles.buttonRow, {backgroundColor: tempColor}]}>
            <Button title="Valider" onPress={handleValidate} color={theme.text}/>
          </View>
        </BottomSheetView>
      </BottomSheetCustomModal>
    </>
  );
};

const styles = StyleSheet.create({
  circle: {
    borderRadius: CORNERS,
    borderWidth: 2,
  },
  buttonRow: {
    borderRadius: CORNERS,
    padding: 4,
    marginHorizontal: 10,
  },
});

export default CircleColorPicker;
