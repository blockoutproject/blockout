import { useImperativeHandle, type Ref } from "react";
import { View } from "react-native";
import type { MapViewProps, MapMarkerProps } from "react-native-maps";

/** Controlled native commands; fixture suites do not reproduce camera geometry or provider tile rendering. */
export const nativeMapCommands = {
  fitToCoordinates: jest.fn(),
  animateToRegion: jest.fn(),
  animateCamera: jest.fn(),
  setCamera: jest.fn(),
  getCamera: jest.fn().mockResolvedValue({ altitude: 10000, zoom: 8 }),
};

/** Preserves native map inputs and commands without announcing readiness or simulating a provider. */
function NativeMap({
  ref,
  ...props
}: MapViewProps & { ref?: Ref<typeof nativeMapCommands> }) {
  useImperativeHandle(ref, () => nativeMapCommands);
  return <View {...props} />;
}

/** Exposes the native marker event and exact coordinate unchanged; actual hit testing remains native evidence. */
function NativeMarker(props: MapMarkerProps) {
  return <View {...props} />;
}

/** Shared native-only boundary for sporting maps and other screens importing their pool composition. */
export const nativeMaps = {
  __esModule: true,
  default: NativeMap,
  Marker: NativeMarker,
  PROVIDER_GOOGLE: "google",
  PROVIDER_DEFAULT: undefined,
};
