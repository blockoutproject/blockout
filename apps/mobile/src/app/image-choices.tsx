import { ImageChoicesScreen } from "../shared/components/image-choices";

/** The shared native sheet receives its current field from the protected stack provider, never URL payloads. */
export default function ImageChoicesRoute() {
  return <ImageChoicesScreen />;
}
