import type { CustomImage } from '@/src/types/Common';

/**
 * Adapts React Native's URI-backed FormData file shape to Orval's Blob signature.
 *
 * React Native accepts the URI, name, and MIME type object at runtime even though
 * the generated browser-oriented multipart signature exposes it as a Blob.
 *
 * @param image - React Native image selected and prepared by the owning form.
 * @returns The same URI-backed file descriptor for generated FormData assembly.
 */
export function toOrvalMultipartFile(image: CustomImage): Blob {
  return image as unknown as Blob;
}
