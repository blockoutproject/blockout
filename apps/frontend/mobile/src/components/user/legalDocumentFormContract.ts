import type { UpdateMobileLegalDocumentRequest } from '@/src/api/generated/mobile-gateway/models';
import type { LegalDocument } from '@/src/types/LegalDocument';
import { z, type ZodInfer } from '@/src/forms';

export const legalDocumentFormSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  version: z.string().min(1, 'Version requise'),
  content: z.string().min(1, 'Contenu requis'),
});

export type LegalDocumentFormValues = ZodInfer<typeof legalDocumentFormSchema>;

export function legalDocumentFormDefaults(
  document: LegalDocument,
): LegalDocumentFormValues {
  return {
    title: document.title,
    version: document.version,
    content: document.content,
  };
}

export function toUpdateMobileLegalDocumentRequest(
  values: LegalDocumentFormValues,
): UpdateMobileLegalDocumentRequest {
  return {
    title: values.title,
    version: values.version,
    content: values.content,
  };
}
