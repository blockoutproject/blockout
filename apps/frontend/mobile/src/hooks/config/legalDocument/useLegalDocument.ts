import { useQuery } from '@tanstack/react-query';
import {
  getGetMobileLegalDocumentQueryKey,
  getMobileLegalDocument,
} from '@/src/api/generated/mobile-gateway/endpoints/mobile-legal-documents/mobile-legal-documents';
import { GetMobileLegalDocumentResponse } from '@/src/api/generated/mobile-gateway/schemas/mobile-legal-documents/mobile-legal-documents.zod';
import type {
  LegalDocument,
  LegalDocumentType,
} from '@/src/types/LegalDocument';
import { toLegalDocumentView } from './legalDocumentView';

export const useLegalDocument = (type: LegalDocumentType) => {
  return useQuery<LegalDocument, Error>({
    queryKey: getGetMobileLegalDocumentQueryKey(type),
    queryFn: async ({ signal }) => {
      const response = await getMobileLegalDocument(type, undefined, signal);
      return toLegalDocumentView(
        GetMobileLegalDocumentResponse.parse(response),
      );
    },
    enabled: !!type,
    staleTime: 60 * 60 * 1000,
  });
};
