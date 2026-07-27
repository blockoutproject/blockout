import { useQuery } from "@tanstack/react-query";
import type { LegalDocumentType } from "@/src/modules/legal/model/legal-document-type";
import type { LegalDocumentResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

export const useLegalDocument = (type: LegalDocumentType) => {
  const { mobile } = useApis();

  return useQuery<LegalDocumentResponse, Error>({
    queryKey: ["legal-doc", type],
    queryFn: () => mobile.legal.getLegalDocument(type),
    enabled: !!type,
    staleTime: 60 * 60 * 1000,
  });
};
