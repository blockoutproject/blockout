import { fireEvent, render, screen } from "@testing-library/react-native";
import { RoundedContainedImage } from "../rounded-contained-image";

it("composes repeated native metadata with the caller's display and failure callbacks", async () => {
  // Given: Expo's native image is the controlled boundary; the caller retains read/error ownership.
  const onLoad = jest.fn();
  const onDisplay = jest.fn();
  const onError = jest.fn();
  await render(
    <RoundedContainedImage
      source={{ uri: "file:///wide.png" }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Pièce jointe paysage"
      style={{ width: 92, height: 92 }}
      onLoad={onLoad}
      onDisplay={onDisplay}
      onError={onError}
    />,
  );
  const image = screen.getByRole("image", { name: "Pièce jointe paysage" });
  const metadata = {
    cacheType: "none",
    source: {
      url: "file:///wide.png",
      width: 160,
      height: 90,
      mediaType: "image/png",
      isAnimated: false,
    },
  };

  // When: native decoding metadata repeats without a new display outcome.
  for (let event = 0; event < 2; event += 1) {
    await fireEvent(image, "load", { nativeEvent: { ...metadata } });
  }

  // Then: measurement does not complete or replace the owner's actual operation.
  expect(onLoad).toHaveBeenCalledTimes(2);
  expect(onLoad).toHaveBeenLastCalledWith(metadata);
  expect(onDisplay).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();

  // When: the native host actually displays, then reports a decode failure.
  await fireEvent(image, "display");
  await fireEvent(image, "error", {
    nativeEvent: { error: "Controlled native decode failure" },
  });

  // Then: existing owner callbacks and the complete image alternative remain intact.
  expect(onDisplay).toHaveBeenCalledTimes(1);
  expect(onError).toHaveBeenCalledWith({
    error: "Controlled native decode failure",
  });
  expect(image).toHaveAccessibleName("Pièce jointe paysage");
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
});
