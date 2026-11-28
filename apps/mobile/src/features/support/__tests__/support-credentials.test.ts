import { supportCredentials } from "../api/support-credentials";

it("does not acquire credentials for ordinary support", async () => {
  // Given
  const getCredentials = jest
    .fn()
    .mockRejectedValue(new Error("Sign-in failed"));

  // When
  const headers = await supportCredentials(false, getCredentials);

  // Then
  expect(headers).toEqual({});
  expect(getCredentials).not.toHaveBeenCalled();
});

it("selects a bearer only for an already requested maintenance bypass", async () => {
  // Given
  const getCredentials = jest
    .fn()
    .mockResolvedValue({ accessToken: "fictional" });

  // When
  const headers = await supportCredentials(true, getCredentials);

  // Then
  expect(headers).toEqual({ Authorization: "Bearer fictional" });
});

it("refuses missing bypass credentials", async () => {
  // Given
  const getCredentials = jest.fn().mockResolvedValue(undefined);

  // When
  const attempt = supportCredentials(true, getCredentials);

  // Then
  await expect(attempt).rejects.toMatchObject({ status: 401 });
});
