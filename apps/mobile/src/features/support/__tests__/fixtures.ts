import type { SubmitSupportRequest } from "../../../../.generated/schemas/index.zod";

/** Fictional contact and Unicode content; no account, provider data or private attachment. */
export const supportMetadata: SubmitSupportRequest = {
  kind: "problem",
  title: "Écran de démonstration 🏐",
  description: "Fixture synthétique : la deuxième ligne\nne s’affiche pas.",
  replyEmail: "support-fixture@example.invalid",
  context: {},
};

/** Canonical compressed-file and complete multipart boundaries, in bytes. */
export const supportLimits = { file: 5_242_880, request: 27_262_976 } as const;

/** Two generated colored pixels; matches the backend's synthetic images without personal content. */
const imageContent = {
  png: "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGP4zwAE/wEHAAH/4iOeWQAAAABJRU5ErkJggg==",
  jpeg: "/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDyK7/4/J/+ujfzooor9nwX+7U/8K/I5cX/ALxU9X+Z/9k=",
};

/** Creates a real synthetic image Blob for transport-only tests, optionally padded to a byte boundary. */
export function supportImage(format: "png" | "jpeg", size?: number): Blob {
  const original = Uint8Array.from(atob(imageContent[format]), (character) =>
    character.charCodeAt(0),
  );
  const bytes = new Uint8Array(size ?? original.length);
  bytes.set(original);
  return new Blob([bytes], { type: `image/${format}` });
}
