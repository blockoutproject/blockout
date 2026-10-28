import { contributionSchema } from "../schemas/contribution-schema";

it.each([
  "http://YouTube.com/a?x=1#t",
  "https://sub.twitch.tv/channel",
  "https://youtu.be/id",
  "https://fb.watch/id",
  "https://www.facebook.com/page",
])("preserves an authorized literal address: %s", (url) => {
  // Given
  const draft = { url };

  // When
  const parsed = contributionSchema.parse(draft);

  // Then
  expect(parsed.url).toBe(url);
});
it.each([
  "",
  "youtube.com/video",
  "https://youtube.com.evil.invalid/video",
  "https://evil-youtube.com",
  "https://person:secret@youtube.com/video",
  "https://sub.youtu.be/id",
  "ftp://twitch.tv/channel",
  "not a URI",
])("refuses unsupported local input: %s", (url) => {
  // Given
  const draft = { url };

  // When
  const parsed = contributionSchema.safeParse(draft);

  // Then
  expect(parsed.success).toBe(false);
});
