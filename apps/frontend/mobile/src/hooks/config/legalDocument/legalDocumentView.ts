import type { MobileLegalDocument } from '@/src/api/generated/mobile-gateway/models';
import type { LegalDocument } from '@/src/types/LegalDocument';
import { z } from '@/src/forms';

const legalDocumentTypeSchema = z.enum(['terms', 'privacy', 'imprint']);

export function toLegalDocumentView(
  response: MobileLegalDocument,
): LegalDocument {
  return {
    type: legalDocumentTypeSchema.parse(response.type),
    title: response.title ?? '',
    version: response.version ?? '',
    content: response.content ?? '',
  };
}
